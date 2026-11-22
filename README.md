# Demon Modz Shop (Cloudflare Pages)

## Files
- `index.html` : Pura website
- `functions/api/[[path]].js` : Server part (supplier/gateway proxy, admin Telegram alert). Cloudflare Pages par apne-aap chalta hai.
- `.gitignore` : Secret files GitHub par na jaayein
- `.nojekyll` : Static files ke liye

## Cloudflare Pages par setup
1. Cloudflare → Workers & Pages → Create → Pages → Connect to Git → yeh repository chuno.
2. Build command: khaali chhodo. Build output directory: `/` (ya khaali).
3. Save and Deploy.
4. Project → Settings → Variables and Secrets mein ye add karo (production):
   - `SUPPLIER_URL` : supplier ka asli endpoint
   - `GATEWAY_URL` : gateway ka base URL
   - `TELEGRAM_BOT_TOKEN` : BotFather se NAYA token (Secret ke roop mein)
   - `ADMIN_CHAT_ID` : `8844137487`
5. Variables save karne ke baad Deployments mein "Retry deployment" ya naya commit karo.
6. Firebase Console → Authentication → Settings → Authorized domains mein apna `*.pages.dev` ya custom domain jodo (Google login ke liye).

## Check
- `https://YOUR-SITE.pages.dev/api/health` → `{"status":"ok"}`

## Update
GitHub par file badlo aur commit karo. Cloudflare apne-aap naya version deploy karega.

## Zaroori
- Bot token, service keys, ya passwords kabhi is repository mein na daalo.
