# Corp Portal UI

Angular 21 + PrimeNG + Tailwind หน้าเว็บของ Corp Portal (ไทย/อังกฤษ) เรียก API จาก [corp-portal-api](https://github.com/singland1997/corp-portal-api)

## รันในเครื่อง

Node 24 (`.nvmrc`) และเปิด API ทั้ง 4 services ก่อน

```sh
npm ci
npm start          # http://localhost:4200, /api ส่งต่อตาม proxy.conf.json
```

ผู้ใช้คนแรก: สร้างด้วย `create-admin` ใน API แล้วเปิด `/set-password?token=<token>`

## ตรวจ

```sh
bash scripts/ci/verify.sh dev     # format, test, build (CI ใช้ตัวเดียวกัน)
```

## โครงสร้าง

```
src/app/features/<feature>/   หน้าจอ + data-access (เรียก API) ของแต่ละเมนู
src/app/shared/ui/            component กลาง (card, data-table, chart, …)
src/app/core/                 auth, API client, ภาษา, ธีม, เมนู
src/app/layout/               header, sidebar
```

| เมนู                  | Feature           | ข้อมูล CRM                    |
| --------------------- | ----------------- | ----------------------------- |
| Dashboard             | `dashboard`       | เลขหมาย, การใช้งาน, Data pool |
| Inventory             | `corporate`       | องค์กร, lot, เลขหมาย, แพ็กเกจ |
| Corporate quota       | `corporate-quota` | `SHARE_IN_GROUP`              |
| Data pool             | `data-pool`       | `CORPORATE_QUOTA`             |
| My corporates (sales) | `my-corporates`   | sales เลือกองค์กรที่ดูแล      |

## Deploy

S3 + CloudFront ผ่าน GitHub Actions: merge เข้า `main` deploy dev เอง, prod สั่งเองที่ Actions → deploy

ตั้งครั้งแรกต่อ environment (AWS account):

1. เพิ่ม OIDC provider `token.actions.githubusercontent.com` (audience `sts.amazonaws.com`)
2. สร้าง role ที่ trust เฉพาะ `repo:singland1997/corp-portal-angular:ref:refs/heads/main` ให้สิทธิ์ S3 bucket/CloudFront ของ Terraform ใน `infra/terraform` และ state bucket
3. ตั้ง repository variables (`DEV_` / `PROD_`): `AWS_ROLE_ARN`, `AWS_ACCOUNT_ID`, `AWS_REGION`, `TF_STATE_BUCKET`, `TF_STATE_REGION`, `API_BASE_URL`, `API_ROUTES`
4. รัน deploy ด้วย `action = plan` ตรวจแล้วค่อย `deploy`

`API_ROUTES` = ผลของ `terraform output -json cloudfront_api_routes` ใน corp-portal-api (JSON list ของ `path_pattern`, `origin_id`, `domain_name`) CloudFront จะส่ง path เหล่านี้ไป API Gateway ของแต่ละ service โดยไม่ cache และส่ง header/cookie ทั้งหมดยกเว้น Host ถ้าไม่ตั้ง `/api` ตอบ 503 ฝั่ง API ต้องตั้ง `PORTAL_ORIGIN` เป็นโดเมนของ distribution นี้ ไม่งั้น refresh cookie ได้ 403

ห้ามใส่ secret ใน `src/environments` (ทุกค่าอยู่ใน JavaScript ที่ deploy)

## Login และ CSP

- refresh token อยู่ใน HttpOnly cookie ที่ API ตั้ง (ไม่เก็บใน JavaScript) access token อยู่ใน memory; reload แล้วขอ session ใหม่จาก cookie
- API ต้องอยู่ host เดียวกับ UI ผ่าน `/api` (deploy UI กับ API คู่กัน; บน AWS คือ `API_ROUTES` ด้านบน)
- CSP ตั้งใน Terraform (`api_base_url` เดียวกับตอน build) ปิด inline-critical CSS เพราะสร้าง inline script
