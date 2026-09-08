// Navigation metadata is independent of URLs and original page headings.
export const sectionOrder = ['Getting Started','Building Scenes','Cameras & Capture','Development & Hosting','Robotics & XR','Overview','Geometry','Models & Point Clouds','Materials & Backgrounds','Scenes & Meshes','Point Clouds & RGB-D','Gaussian Splats','Cameras','Interaction','Layout & Helpers','VR & XR','Core','Sessions & Workspace','Schemas','Cameras & Frames','RTC','CLI','Utilities','Releases'];
export const tabs = [
 {id:'learn',label:'Learn',numeral:'I',landing:'/',urlPrefix:'/learn'},
 {id:'components',label:'Components',numeral:'II',landing:'/components',urlPrefix:'/components'},
 {id:'examples',label:'Examples',numeral:'III',landing:'/examples',urlPrefix:'/examples'},
 {id:'python-api',label:'Python API',numeral:'IV',landing:'/python-api',urlPrefix:'/python-api'},
 {id:'releases',label:'Releases',numeral:'V',landing:'/releases',urlPrefix:'/releases'},
];
const groups = {
 'Getting Started': ['index','quick_start','tutorials/basics','guides/first_3d_scene/01_constructing_a_scene'],
 'Building Scenes': ['guides/first_3d_scene/02_materials_and_textures','guides/first_3d_scene/03_camera_control','guides/first_3d_scene/04_lights','guides/first_3d_scene/05_render_modes','guides/first_3d_scene/05_render_modes/path_tracing','guides/first_3d_scene/05_render_modes/post_processing','guides/session_apis','tutorials/basics/simple_life_cycle','tutorials/obj_loading'],
 'Cameras & Capture': ['tutorials/camera/README','tutorials/camera/frustum_transformation','tutorials/camera/grab_render_virtual_camera','tutorials/camera/grab_heightmap','tutorials/camera/record_camera_movement','tutorials/camera/move_camera','tutorials/camera/render_queue'],
 'Development & Hosting': ['guides/claude_skill','guides/cli','guides/client_connection','tutorials/basics/async_programming','tutorials/basics/ipython_jupyter','guides/static_files','tutorials/basics/adding_html_handler','tutorials/basics/localtunnel_setup','tutorials/basics/ngrok_setup','tutorials/basics/self_signed_cert'],
 'Robotics & XR': ['tutorials/basics/ssl_proxy_webxr','tutorials/physics/mujoco_wasm','tutorials/mujoco_interactive_simulator','tutorials/physics/mujoco_gallery','tutorials/physics/mocap_control','tutorials/physics/mocap_hand_control','tutorials/physics','tutorials/teleoperation'],
 'Geometry': ['arrow','bounding_box','line','trimesh'].map(x=>'components/'+x),
 'Models & Point Clouds': ['glb','obj','ply','pcd','pointcloud','urdf','bvh','luma_splats','spark_splats','splat'].map(x=>'components/'+x),
 'Materials & Backgrounds': ['image_background','scene_background'].map(x=>'components/'+x),
 'Cameras': ['components/camera_views','components/frustum','examples/spline_frustum'],
 'Interaction': ['gripper','hands','keyboard_monitor','motion_controllers','movable','pivot'].map(x=>'components/'+x),
 'Layout & Helpers': ['billboard','center','coords_marker','grid','group','text','text3d'].map(x=>'components/'+x),
 'Scenes & Meshes': ['background/sky_ball','meshes/mesh_loading','meshes/textured_trimesh','urdf_go1_stairs','visualization/3d_text'].map(x=>'examples/'+x),
 'Point Clouds & RGB-D': ['pointer','background/depth_image','point_clouds/pointcloud','point_clouds/animation','point_clouds/animation_upsert','point_clouds/depth_pointcloud','visualization/depth_texture'].map(x=>'examples/'+x),
 'Gaussian Splats':['examples/openai_sora'],
 'VR & XR':['examples/background/vr_hud','examples/26_webxr_mesh','examples/vr_xr/body_tracking','examples/vr_xr/hand_tracking','examples/vr_xr/motion_controllers'],
 'Releases':['releases/index','releases/unreleased','releases/v0.1.5','releases/v0.0.80rc4','releases/v0.0.80rc2','releases/v0.0.80rc1','CHANGE_LOG','versions'],
};
const titles = {
 index:'Overview',quick_start:'Getting Started','tutorials/basics':'Key Concepts',
 'guides/first_3d_scene/01_constructing_a_scene':'First Scene',
 'guides/first_3d_scene/02_materials_and_textures':'Materials & Textures',
 'guides/first_3d_scene/03_camera_control':'Camera Control','guides/first_3d_scene/04_lights':'Lights','guides/first_3d_scene/05_render_modes':'Render Modes',
 'guides/first_3d_scene/05_render_modes/path_tracing':'Path Tracing',
 'guides/session_apis':'Session APIs','guides/static_files':'Static Files & Hot Reload','guides/claude_skill':'Claude Code','guides/client_connection':'Python Client',
 'tutorials/basics/simple_life_cycle':'Component Lifecycle','tutorials/obj_loading':'Asset Loading',
 'tutorials/camera/frustum_transformation':'Camera Matrices','tutorials/camera/grab_render_virtual_camera':'Collecting Renders','tutorials/camera/grab_heightmap':'Height Maps','tutorials/camera/record_camera_movement':'Recording Camera Movement','tutorials/camera/move_camera':'Replaying Camera Movement','tutorials/camera/render_queue':'Multiple Sessions',
 'tutorials/basics/async_programming':'Async Python','tutorials/basics/ipython_jupyter':'IPython / Jupyter','tutorials/basics/adding_html_handler':'Dynamic HTML','tutorials/basics/localtunnel_setup':'Localtunnel','tutorials/basics/ngrok_setup':'ngrok','tutorials/basics/self_signed_cert':'Self-signed Certificates','tutorials/basics/ssl_proxy_webxr':'TLS for WebXR',
 'tutorials/physics/mujoco_wasm':'MuJoCo Overview','tutorials/mujoco_interactive_simulator':'In-browser Simulation','tutorials/physics/mujoco_gallery':'MuJoCo Gallery','tutorials/physics/mocap_control':'VR Mocap','tutorials/physics/mocap_hand_control':'Hand Mocap','tutorials/physics':'Mixed Reality Physics','tutorials/teleoperation':'Teleoperation',
 'components/index':'Component Catalog','examples/index':'Example Gallery',
 'examples/background/sky_ball':'360° Background','examples/point_clouds/pointcloud':'Point Cloud Streaming','examples/point_clouds/depth_pointcloud':'Depth to Point Cloud','examples/spline_frustum':'Camera Trajectories','examples/urdf_go1_stairs':'Unitree Go1 & Stairs','versions':'Previous Versions',CHANGE_LOG:'Older Release History',
 'rtc/README':'RTC Overview','rtc/scene_store':'SceneStore Guide',
};
export function navigationFor(slug) {
 slug=slug.replace(/\.mdx$/,'');
 const result={};
 if(slug==='RELEASE_NOTES') return {section:'Releases',hidden:true,noindex:true};
 if(titles[slug]) result.title=titles[slug];
 for(const [section,items] of Object.entries(groups)) {
  const i=items.indexOf(slug);
  if(i>=0) return {...result,section,order:sectionOrder.indexOf(section)*100+i};
 }
 if(['components/index','examples/index','python-api'].includes(slug)) return {...result,section:'Overview',order:-1};
 if(slug.startsWith('api/') || slug.startsWith('components/category_') || slug==='components/component_index' || ['examples/background_environment','examples/meshes','examples/point_clouds','tutorials/basics/setting_a_scene'].includes(slug)) return {...result,hidden:true};
 if(slug.startsWith('rtc/')) return {...result,section:'RTC',order:sectionOrder.indexOf('RTC')*100+90+(slug.endsWith('scene_store')?1:0)};
 if(slug.startsWith('python-api/')) {
  const module=slug.slice('python-api/'.length).replaceAll('/','.');
  let section='Core';
  if(/(^|\.)test[s_]?/.test(module)) return {hidden:true,noindex:true};
  if(/workspace/.test(module))section='Sessions & Workspace';
  else if(/schemas/.test(module))section='Schemas';
  else if(/frame|addons/.test(module))section='Cameras & Frames';
  else if(/rtc|webrtc/.test(module))section='RTC';
  else if(/(^|\.)cli(\.|$)/.test(module))section='CLI';
  else if(/utils|serdes/.test(module))section='Utilities';
  return {section,order:sectionOrder.indexOf(section)*100};
 }
 throw new Error('Unclassified docs page: '+slug);
}
export function applyNavigation(source,slug) {
 const metadata=navigationFor(slug);
 return source.replace(/^---\n([\s\S]*?)\n---/,(_,fm)=>{
  for(const [key,value] of Object.entries(metadata)) {
   const line=key+': '+JSON.stringify(value),pattern=new RegExp('^'+key+':.*$','m');
   fm=pattern.test(fm)?fm.replace(pattern,line):fm+'\n'+line;
  }
  return '---\n'+fm+'\n---';
 });
}
