import { onRequestOptions as __spoof_photo_js_onRequestOptions } from "/Users/perignon/Desktop/mori-team-app/functions/spoof-photo.js"
import { onRequestPost as __spoof_photo_js_onRequestPost } from "/Users/perignon/Desktop/mori-team-app/functions/spoof-photo.js"
import { onRequestOptions as __spoof_video_js_onRequestOptions } from "/Users/perignon/Desktop/mori-team-app/functions/spoof-video.js"
import { onRequestPost as __spoof_video_js_onRequestPost } from "/Users/perignon/Desktop/mori-team-app/functions/spoof-video.js"

export const routes = [
    {
      routePath: "/spoof-photo",
      mountPath: "/",
      method: "OPTIONS",
      middlewares: [],
      modules: [__spoof_photo_js_onRequestOptions],
    },
  {
      routePath: "/spoof-photo",
      mountPath: "/",
      method: "POST",
      middlewares: [],
      modules: [__spoof_photo_js_onRequestPost],
    },
  {
      routePath: "/spoof-video",
      mountPath: "/",
      method: "OPTIONS",
      middlewares: [],
      modules: [__spoof_video_js_onRequestOptions],
    },
  {
      routePath: "/spoof-video",
      mountPath: "/",
      method: "POST",
      middlewares: [],
      modules: [__spoof_video_js_onRequestPost],
    },
  ]