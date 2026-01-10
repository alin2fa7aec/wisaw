# WISAW - Web Invitation for Saki & Akira Wedding

## 概要

WISAW とは...  
結婚式のためのWeb招待状。  
自慢したり、結婚式に向けてやってる感をアピールするために DIY する。  

## 要件

### Mandatory

- 以下の項目をユーザーに入力させる
	- お名前
	- おところ
	- 出欠
	- 連絡先
	- アレルギー有無
	- 自由記載欄
- ユーザーに入力させた内容を保存する
- ユーザーにメールを送信する
- 式についての諸々の情報を表示する

### Additional

- なんか豪華な見た目にする
	- 写真を見せつけたりとか

## 技術

| roll | item |
| -- | -- |
| language (fe/be) | Typescript |
| build | vite |
| platform (dev) | wsl debian |
| platform (web) | aws |
| ui framework | tailwind css |
| ui library | MynaUI |

memo (minimul structure from ChatGPT)
```
[Browser]
   ↓ HTTPS
CloudFront
   ↓
S3 (Frontend)
   ↓
API Gateway
   ↓
Lambda (TypeScript)
   ↓
DynamoDB
   ↓
SES
```
