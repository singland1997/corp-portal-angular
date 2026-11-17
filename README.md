# Corp Portal UI

เว็บจัดการองค์กร ซิม แพ็กเกจ และการใช้งาน พัฒนาด้วย **Angular 21 + PrimeNG 21 + Tailwind CSS** รองรับไทยและอังกฤษ

## เริ่มใช้งาน

ใช้ **Node.js 24 / npm 11** เปิด backend ทั้ง 4 services ก่อน แล้วรันในโฟลเดอร์นี้:

```sh
npm ci
npm start
```

เข้า http://localhost:4200 ไม่มีบัญชีสำเร็จรูป: ผู้ดูแลคนแรกสร้างด้วย `cargo run --locked -p identity-service --bin create-admin` ในโปรเจกต์ backend (ตั้ง `IDENTITY_ADMIN_EMAIL`, `IDENTITY_ADMIN_NAME`) แล้วเปิด `http://localhost:4200/set-password?token=<token ที่พิมพ์ออกมา>` เพื่อตั้งรหัสผ่าน ผู้ใช้อื่นสร้างจากหน้า Users

## คำสั่งที่ใช้บ่อย

| คำสั่ง                      | หน้าที่                           |
| --------------------------- | --------------------------------- |
| `npm start`                 | รัน local พร้อมอัปเดตเมื่อแก้โค้ด |
| `npm run start:dev`         | รันด้วยค่า dev บนเครื่อง          |
| `npm run build:dev`         | Build สำหรับ dev                  |
| `npm run build:prod`        | Build สำหรับ prod                 |
| `npm test -- --watch=false` | รัน unit tests                    |
| `npm run format`            | จัดรูปแบบโค้ดและเอกสาร            |

ไฟล์สำหรับ deploy อยู่ที่ `dist/corp-portal-ui/browser`

## แก้โค้ดตรงไหน

| ตำแหน่ง                                     | ใช้ทำอะไร                                             |
| ------------------------------------------- | ----------------------------------------------------- |
| `src/app/features/`                         | หน้าจอและการทำงานแต่ละโมดูล เริ่มแก้งานส่วนใหญ่ที่นี่ |
| `features/<ชื่อโมดูล>/data-access/`         | เรียก API ของโมดูล                                    |
| `src/app/shared/ui/`                        | Component กลาง เช่น card, table, form และ dialog      |
| `src/app/core/`                             | Auth, API client, ภาษา และธีม                         |
| `src/app/layout/`                           | Header, sidebar, footer และโครงหน้า                   |
| `src/app/app.routes.ts`                     | เพิ่มเส้นทางหน้าจอ                                    |
| `src/app/core/routing/portal-navigation.ts` | เพิ่มเมนู                                             |
| `src/environments/`                         | ค่า local, dev และ prod                               |
| `public/`                                   | รูป โลโก้ และไฟล์ static                              |

แยก TypeScript กับ HTML ใช้ PrimeNG และ Tailwind เป็นหลัก ส่วน component กลางรับข้อมูลและส่ง event กลับ ให้ feature เป็นผู้เรียก API

เพิ่ม PrimeNG component ใหม่ ให้เพิ่มธีมที่ใช้ใน `core/theme/aura.preset.ts` ด้วย ดูตัวอย่างการใช้ส่วนกลางใน [คู่มือ UI](docs/ui-guide.md)

## สิ่งที่ควรรู้

- Login ผ่าน API สำเร็จแล้วไป Dashboard; รีเฟรชหน้าใช้ refresh token ใน sessionStorage เพื่อกู้ session
- Admin จัดการผู้ใช้ได้ ฝ่ายขายเข้าถึงเฉพาะองค์กรที่มอบหมาย และหนึ่งองค์กรมีฝ่ายขายดูแลได้คนเดียว
- ข้อมูลทดสอบอยู่หลังบ้านใน memory เมื่อ restart backend ข้อมูลที่แก้และ session จะหาย
- Local ส่ง `/api` ผ่าน `proxy.conf.json` หากแก้ proxy ให้ restart frontend
- Environment ของ Jenkins กำหนดตาม branch `dev` / `prod`; ห้ามใส่ secret ใน Angular environment
- Frontend deploy บน S3 + CloudFront ดู [คู่มือ AWS/Jenkins](docs/aws-deployment.md)

## เอกสารเพิ่มเติม

- [Component กลาง ภาษา และธีม](docs/ui-guide.md)
- [การเชื่อม API และข้อจำกัดปัจจุบัน](docs/api-integration.md)
- [Pooling](docs/pooling.md)
- [Docker สำหรับทดลองในเครื่อง](docs/local-docker.md)
- [AWS, Terraform และ Jenkins](docs/aws-deployment.md)
