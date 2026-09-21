// A GPU stable-fluids solver. All fields use floating-point ping-pong textures.
// Velocity is stored in simulation cells/second; dye is transported by that field.
const vertexSource = `#version 300 es
precision highp float;
out vec2 uv;
void main(){
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  uv = p; gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;
const header = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 uv;
out vec4 frag;
uniform vec2 texel;
vec4 linearSample(sampler2D field, vec2 p){
  vec2 size = vec2(textureSize(field, 0));
  vec2 pos = p * size - .5;
  vec2 f = fract(pos); vec2 base = (floor(pos) + .5) / size;
  vec2 d = 1.0 / size;
  return mix(mix(texture(field, base), texture(field, base + vec2(d.x,0)), f.x),
             mix(texture(field, base + vec2(0,d.y)), texture(field, base+d), f.x), f.y);
}
`;
const shaders = {
  splat: `uniform sampler2D source; uniform vec2 point; uniform vec3 color; uniform float radius; uniform float aspect;
    void main(){vec2 p=uv-point;p.x*=aspect;vec3 s=exp(-dot(p,p)/radius)*color;
    frag=vec4(clamp(texture(source,uv).xyz+s,vec3(-1200),vec3(1200)),1);}`,
  advect: `uniform sampler2D source;uniform sampler2D velocity;uniform float dt;uniform float decay;
    void main(){vec2 v=linearSample(velocity,uv).xy;vec2 coord=uv-dt*v*texel;
    frag=vec4(linearSample(source,coord).xyz/(1.0+decay*dt),1);}`,
  curl: `uniform sampler2D velocity;
    void main(){float l=texture(velocity,uv-vec2(texel.x,0)).y;float r=texture(velocity,uv+vec2(texel.x,0)).y;
    float b=texture(velocity,uv-vec2(0,texel.y)).x;float t=texture(velocity,uv+vec2(0,texel.y)).x;
    frag=vec4(.5*(r-l-t+b),0,0,1);}`,
  vorticity: `uniform sampler2D velocity;uniform sampler2D curls;uniform float strength;uniform float dt;
    void main(){float l=texture(curls,uv-vec2(texel.x,0)).x;float r=texture(curls,uv+vec2(texel.x,0)).x;
    float b=texture(curls,uv-vec2(0,texel.y)).x;float t=texture(curls,uv+vec2(0,texel.y)).x;
    float c=texture(curls,uv).x;vec2 f=.5*vec2(abs(t)-abs(b),abs(r)-abs(l));
    f/=length(f)+.0001;f*=strength*c;f.y*=-1.;
    frag=vec4(clamp(texture(velocity,uv).xy+f*dt,vec2(-700),vec2(700)),0,1);}`,
  divergence: `uniform sampler2D velocity;
    void main(){float l=texture(velocity,uv-vec2(texel.x,0)).x;float r=texture(velocity,uv+vec2(texel.x,0)).x;
    float b=texture(velocity,uv-vec2(0,texel.y)).y;float t=texture(velocity,uv+vec2(0,texel.y)).y;
    vec2 c=texture(velocity,uv).xy;
    if(uv.x<texel.x)l=-c.x;if(uv.x>1.-texel.x)r=-c.x;
    if(uv.y<texel.y)b=-c.y;if(uv.y>1.-texel.y)t=-c.y;
    frag=vec4(.5*(r-l+t-b),0,0,1);}`,
  pressure: `uniform sampler2D pressure;uniform sampler2D divergence;
    void main(){float l=texture(pressure,uv-vec2(texel.x,0)).x;float r=texture(pressure,uv+vec2(texel.x,0)).x;
    float b=texture(pressure,uv-vec2(0,texel.y)).x;float t=texture(pressure,uv+vec2(0,texel.y)).x;
    float div=texture(divergence,uv).x;frag=vec4((l+r+b+t-div)*.25,0,0,1);}`,
  gradient: `uniform sampler2D pressure;uniform sampler2D velocity;
    void main(){float l=texture(pressure,uv-vec2(texel.x,0)).x;float r=texture(pressure,uv+vec2(texel.x,0)).x;
    float b=texture(pressure,uv-vec2(0,texel.y)).x;float t=texture(pressure,uv+vec2(0,texel.y)).x;
    vec2 v=texture(velocity,uv).xy-.5*vec2(r-l,t-b);
    if(uv.x<texel.x||uv.x>1.-texel.x)v.x=0.;if(uv.y<texel.y||uv.y>1.-texel.y)v.y=0.;
    frag=vec4(v,0,1);}`,
  display: `uniform sampler2D dye;uniform vec2 dyeTexel;
    void main(){vec3 color=max(linearSample(dye,uv).rgb,vec3(0));
    float l=length(linearSample(dye,uv-vec2(dyeTexel.x,0)).rgb);
    float r=length(linearSample(dye,uv+vec2(dyeTexel.x,0)).rgb);
    float b=length(linearSample(dye,uv-vec2(0,dyeTexel.y)).rgb);
    float t=length(linearSample(dye,uv+vec2(0,dyeTexel.y)).rgb);
    vec3 normal=normalize(vec3((l-r)*.6,(b-t)*.6,1.));
    float light=clamp(dot(normal,normalize(vec3(-.4,.6,1.))),.45,1.);
    vec3 glow=(linearSample(dye,uv+vec2(.012,0)).rgb+linearSample(dye,uv-vec2(.012,0)).rgb+
      linearSample(dye,uv+vec2(0,.012)).rgb+linearSample(dye,uv-vec2(0,.012)).rgb)*.035;
    color=vec3(1.)-exp(-(color*(.85+light*.25)+glow)*.85);
    vec3 bg=mix(vec3(.018,.027,.045),vec3(.035,.055,.086),uv.y);
    float vignette=1.-.32*pow(length((uv-.5)*1.25),2.);
    frag=vec4((bg+color)*vignette,1.);}`,
};

export class Fluid {
  constructor(canvas, settings) {
    this.canvas = canvas;
    this.settings = settings;
    this.quality = 'medium';
    this.fields = [];
    this.programs = {};
    const gl = canvas.getContext('webgl2', {alpha:false, antialias:false, depth:false, stencil:false, preserveDrawingBuffer:false, powerPreference:'high-performance'});
    if (!gl) throw new Error('WebGL 2 is unavailable. Enable graphics acceleration in Chrome’s system settings, then reload.');
    this.gl = gl;
    if (!gl.getExtension('EXT_color_buffer_float')) throw new Error('Your graphics device does not support floating-point fluid textures. Try Chrome with graphics acceleration enabled or a different device.');
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    const vertex = this.compile(gl.VERTEX_SHADER, vertexSource);
    for (const [name, source] of Object.entries(shaders)) {
      const fragment = this.compile(gl.FRAGMENT_SHADER, header + source);
      const program = gl.createProgram();
      gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
      const uniforms = {};
      for (let i=0;i<gl.getProgramParameter(program,gl.ACTIVE_UNIFORMS);i++) {
        const info = gl.getActiveUniform(program,i);
        uniforms[info.name] = gl.getUniformLocation(program,info.name);
      }
      this.programs[name] = {program, uniforms};
      gl.deleteShader(fragment);
    }
    gl.deleteShader(vertex);
    this.vao=gl.createVertexArray();gl.bindVertexArray(this.vao);
    this.resize(true);
  }
  compile(type, source) {
    const gl=this.gl, shader=gl.createShader(type);
    gl.shaderSource(shader,source);gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  }
  field(width,height) {
    const gl=this.gl,texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA16F,width,height,0,gl.RGBA,gl.HALF_FLOAT,null);
    const fbo=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);
    if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE) throw new Error('This graphics device cannot create the simulation buffer. Try another render quality or update the graphics driver.');
    gl.viewport(0,0,width,height);gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT);
    const field={texture,fbo,width,height};this.fields.push(field);return field;
  }
  pair(w,h) {return {read:this.field(w,h),write:this.field(w,h),swap(){[this.read,this.write]=[this.write,this.read];}};}
  resize(force=false) {
    const box=this.canvas.getBoundingClientRect();
    const ratio=Math.min(window.devicePixelRatio||1, this.quality==='high'?1.75:1.25);
    const width=Math.max(1,Math.round(box.width*ratio)),height=Math.max(1,Math.round(box.height*ratio));
    if(!force && this.canvas.width===width && this.canvas.height===height)return false;
    this.canvas.width=width;this.canvas.height=height;
    const aspect=width/height;
    // Resize only the display unless orientation/aspect ratio actually changes.
    if(!force && this.aspect && Math.abs(aspect-this.aspect)<.015)return false;
    this.aspect=aspect;
    for(const f of this.fields){this.gl.deleteTexture(f.texture);this.gl.deleteFramebuffer(f.fbo);}
    this.fields=[];
    const sim={low:96,medium:144,high:224}[this.quality];
    const dye={low:384,medium:640,high:1024}[this.quality];
    const dims=(n)=>aspect>=1?[Math.round(n*aspect),n]:[n,Math.round(n/aspect)];
    [this.w,this.h]=dims(sim);
    const [dw,dh]=dims(dye);
    this.velocity=this.pair(this.w,this.h);this.dye=this.pair(dw,dh);
    this.pressure=this.pair(this.w,this.h);this.divergence=this.field(this.w,this.h);this.curls=this.field(this.w,this.h);
    return true;
  }
  run(name, target, textures={}, values={}) {
    const gl=this.gl, p=this.programs[name];gl.useProgram(p.program);
    let unit=0;
    for(const [key,field] of Object.entries(textures)){
      gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,field.texture);
      gl.uniform1i(p.uniforms[key],unit++);
    }
    if(p.uniforms.texel)gl.uniform2f(p.uniforms.texel,1/this.w,1/this.h);
    for(const [key,value] of Object.entries(values)){
      const loc=p.uniforms[key];
      if(Array.isArray(value)){if(value.length===2)gl.uniform2fv(loc,value);else gl.uniform3fv(loc,value);}
      else gl.uniform1f(loc,value);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER,target?.fbo||null);
    gl.viewport(0,0,target?.width||this.canvas.width,target?.height||this.canvas.height);
    gl.drawArrays(gl.TRIANGLES,0,3);
  }
  splat(x,y,dx,dy,color,radius=this.settings.radius) {
    const values={point:[x,y],radius:radius*.004,aspect:this.aspect,color:[dx,dy,0]};
    this.run('splat',this.velocity.write,{source:this.velocity.read},values);this.velocity.swap();
    values.color=color;
    this.run('splat',this.dye.write,{source:this.dye.read},values);this.dye.swap();
  }
  step(dt) {
    const v=this.velocity, p=this.pressure;
    this.run('advect',v.write,{source:v.read,velocity:v.read},{dt,decay:this.settings.diffusion});v.swap();
    this.run('curl',this.curls,{velocity:v.read});
    this.run('vorticity',v.write,{velocity:v.read,curls:this.curls},{dt,strength:this.settings.swirl});v.swap();
    this.run('divergence',this.divergence,{velocity:v.read});
    // Reset pressure each solve so previous forces cannot bias the new projection.
    const gl=this.gl;gl.bindFramebuffer(gl.FRAMEBUFFER,p.read.fbo);gl.clear(gl.COLOR_BUFFER_BIT);
    const iterations=this.quality==='high'?24:16;
    for(let i=0;i<iterations;i++){this.run('pressure',p.write,{pressure:p.read,divergence:this.divergence});p.swap();}
    this.run('gradient',v.write,{pressure:p.read,velocity:v.read});v.swap();
    this.run('advect',this.dye.write,{source:this.dye.read,velocity:v.read},{dt,decay:this.settings.persistence});this.dye.swap();
  }
  render(){this.run('display',null,{dye:this.dye.read},{dyeTexel:[1/this.dye.read.width,1/this.dye.read.height]});}
  clear(){const gl=this.gl;for(const f of this.fields){gl.bindFramebuffer(gl.FRAMEBUFFER,f.fbo);gl.clear(gl.COLOR_BUFFER_BIT);}this.render();}
  setQuality(quality){this.quality=quality;this.resize(true);}
  destroy(){const gl=this.gl;for(const f of this.fields){gl.deleteTexture(f.texture);gl.deleteFramebuffer(f.fbo);}for(const p of Object.values(this.programs))gl.deleteProgram(p.program);gl.deleteVertexArray(this.vao);}
}
