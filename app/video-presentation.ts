export type PresentationVideo=HTMLVideoElement&{
 webkitEnterFullscreen?:()=>void;
 webkitSupportsFullscreen?:boolean;
 webkitSetPresentationMode?:(mode:'inline'|'fullscreen'|'picture-in-picture')=>void;
 webkitSupportsPresentationMode?:(mode:string)=>boolean;
 webkitPresentationMode?:string;
};
export function canVideoFullscreen(video:PresentationVideo,doc:Document){
 return !!((video.webkitEnterFullscreen&&video.webkitSupportsFullscreen!==false)||(typeof video.requestFullscreen==='function'&&doc.fullscreenEnabled!==false));
}
export function canVideoPip(video:PresentationVideo,doc:Document){
 return !!((typeof video.requestPictureInPicture==='function'&&doc.pictureInPictureEnabled&&!video.disablePictureInPicture)||(video.webkitSetPresentationMode&&video.webkitSupportsPresentationMode?.('picture-in-picture')));
}
// Invoke directly from a tap: do not await playback or rendering first, which loses user activation.
export async function enterVideoFullscreen(video:PresentationVideo,doc:Document){
 if(video.readyState<1)throw new Error('Wait for the video to load, then tap Fullscreen again.');
 if(video.webkitEnterFullscreen&&video.webkitSupportsFullscreen!==false){video.webkitEnterFullscreen();return}
 if(typeof video.requestFullscreen==='function'&&doc.fullscreenEnabled!==false){await video.requestFullscreen({navigationUI:'hide'});if(doc.fullscreenElement===video)return}
 throw new Error('This browser does not allow fullscreen video here. Open this page in Safari or Chrome, or use the video’s own fullscreen control.');
}
export async function toggleVideoPip(video:PresentationVideo,doc:Document){
 if(doc.pictureInPictureElement===video){await doc.exitPictureInPicture();return}
 if(video.webkitPresentationMode==='picture-in-picture'){video.webkitSetPresentationMode?.('inline');return}
 if(video.readyState<1)throw new Error('Wait for the video to load, then tap Picture in Picture again.');
 if(video.webkitSetPresentationMode&&video.webkitSupportsPresentationMode?.('picture-in-picture')){video.webkitSetPresentationMode('picture-in-picture');return}
 if(typeof video.requestPictureInPicture==='function'&&doc.pictureInPictureEnabled&&!video.disablePictureInPicture){await video.requestPictureInPicture();return}
 throw new Error('Picture in Picture is unavailable in this browser or disabled in its settings. Try opening this page in Safari or Chrome.');
}
