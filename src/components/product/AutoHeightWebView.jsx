import React, { useState, useMemo } from 'react';
import { View, Linking } from 'react-native';
import { WebView } from 'react-native-webview';

/* The product overview is raw seller HTML (inline <img> tags, tables) — the
   web page dropped it into a div with `[&_img]:max-w-full [&_*]:max-w-full`
   and `word-break: break-word`. A WebView is the only faithful renderer; it
   reports its document height so it can sit inside the page's ScrollView at
   full height, like the web div. Images go out with no referrer (1688's CDN
   refuses hotlinks). */
const REPORT = `
(function(){
  function post(){ window.ReactNativeWebView.postMessage(String(Math.ceil(document.documentElement.scrollHeight))); }
  window.addEventListener('load', post);
  document.querySelectorAll('img').forEach(function(i){ i.setAttribute('referrerpolicy','no-referrer'); i.addEventListener('load', post); i.addEventListener('error', post); });
  if (window.ResizeObserver) new ResizeObserver(post).observe(document.body);
  setTimeout(post, 300); setTimeout(post, 1500);
})(); true;`;

export default function AutoHeightWebView({ html, fontSize = 16, color = '#1e293b' }) {
  const [height, setHeight] = useState(240);
  const source = useMemo(
    () => ({
      html: `<!doctype html><html><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>html,body{margin:0;padding:0;background:#fff}body{font-family:Arial,Helvetica,sans-serif;font-size:${fontSize}px;line-height:1.5;color:${color};overflow-x:hidden;word-break:break-word}*{max-width:100%!important;box-sizing:border-box}img{max-width:100%!important;height:auto!important;width:auto}table{max-width:100%!important}
/* Tailwind preflight, which the web page's description inherits */
p,h1,h2,h3,h4,h5,h6,blockquote,figure,dl,dd,pre{margin:0}h1,h2,h3,h4,h5,h6{font-size:inherit;font-weight:inherit}img,video,svg{display:block;vertical-align:middle}ol,ul{list-style:none;margin:0;padding:0}table{border-collapse:collapse;text-indent:0;border-color:inherit}</style>
</head><body>${html}</body></html>`,
      baseUrl: 'https://www.paicart.com/',
    }),
    [html, fontSize, color],
  );

  return (
    <View style={{ height, overflow: 'hidden' }}>
      <WebView
        originWhitelist={['*']}
        source={source}
        injectedJavaScript={REPORT}
        onMessage={(e) => {
          const h = parseInt(e.nativeEvent.data, 10);
          if (h > 0 && Math.abs(h - height) > 2) setHeight(h);
        }}
        scrollEnabled={false}
        nestedScrollEnabled={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        setSupportMultipleWindows={false}
        onShouldStartLoadWithRequest={(req) => {
          if (req.navigationType === 'click' || (req.url.startsWith('http') && !req.url.startsWith('https://www.paicart.com/'))) {
            if (req.isTopFrame !== false && req.url !== 'about:blank') {
              Linking.openURL(req.url).catch(() => {});
              return false;
            }
          }
          return true;
        }}
        style={{ backgroundColor: 'transparent' }}
      />
    </View>
  );
}
