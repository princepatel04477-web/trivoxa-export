import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport:{width:1440,height:900}, deviceScaleFactor:2 });
const p = await ctx.newPage();
const out=[];
for (const route of ['/','/group','/rfq']) {
  await p.goto('http://localhost:3123'+route, { waitUntil:'load', timeout:45000 });
  await p.waitForTimeout(1500);
  out.push({route, ...await p.evaluate(()=>{
    const cs=[...document.querySelectorAll('.container')].filter(c=>!c.closest('.contact-modal'));
    const c=cs[0];
    const st=c&&getComputedStyle(c);
    const h1=document.querySelector('h1');
    return {
      n:cs.length,
      w:c?Math.round(c.getBoundingClientRect().width):null,
      maxW:st&&st.maxWidth, padL:st&&st.paddingLeft, padR:st&&st.paddingRight,
      h1Size:h1?getComputedStyle(h1).fontSize:null,
      bodyH:document.body.scrollHeight,
    };
  })});
}
console.table(out);
await b.close();
