# การเชื่อม API และสถานะงาน

หน้าบ้านเรียก API เท่านั้น ไม่มีบัญชีหรือข้อมูลธุรกิจจำลองใน runtime ของ Angular ข้อมูลอยู่ใน PostgreSQL ของหลังบ้าน (ข้อมูล CRM มาจาก `crm-sync`) ตัวอย่างใน `src/testing` ใช้เฉพาะ unit tests

## เริ่มใช้ในเครื่อง

1. เตรียมฐานข้อมูลตาม `corp-portal-api/docs/postgresql.md` (`migrate` แล้ว `crm-sync`)
2. สร้างผู้ดูแลคนแรก: ตั้ง `IDENTITY_ADMIN_EMAIL`, `IDENTITY_ADMIN_NAME` แล้วรัน `cargo run --locked -p identity-service --bin create-admin` จะได้ token ตั้งรหัสผ่านใช้ครั้งเดียว เปิด `/set-password?token=...` ใน frontend เพื่อตั้งรหัส แล้ว login ด้วยอีเมลนั้น ผู้ใช้อื่นสร้างจากหน้า Users
3. เปิด **API - Run All** ใน IDE หรือรัน 4 service แยก terminal ตาม README ของ backend
4. เข้า frontend แล้ว `npm start` ใช้ `proxy.conf.json` ส่ง `/api/v1` ไป ports 4101–4104

บัญชีองค์กรเห็นเฉพาะตัวเอง Admin เลือกองค์กรได้จาก header หรือเมนูผู้ใช้บนมือถือ การสลับองค์กรล้างข้อมูลเดิม ฟอร์ม รายการที่เลือก และยกเลิกคำขออ่านที่ค้างอยู่

ข้อมูลธุรกิจอยู่ใน PostgreSQL restart service แล้วข้อมูลยังอยู่ Dashboard อ่านยอดล่าสุดจาก Corporate/Telecom เพื่อให้จำนวนและโควตาตรงกัน

## โครงสร้างที่ใช้แก้งาน

| ตำแหน่ง                                       | หน้าที่                                             |
| --------------------------------------------- | --------------------------------------------------- |
| `core/auth/auth-api.service.ts`               | เรียก login, me, logout                             |
| `core/auth/auth-session.store.ts`             | JWT และผู้ใช้ใน memory; ล้างเมื่อหมดอายุ            |
| `core/auth/auth.interceptor.ts`               | Bearer เฉพาะ origin/path ของ API; จัดการ 401        |
| `core/corporate/corporate-context.service.ts` | องค์กรปัจจุบันและรายชื่อที่ API อนุญาต              |
| `core/api/api-client.ts`                      | URL, header องค์กร, timeout 30 วินาที               |
| `core/api/corporate-resource.ts`              | loading/error/retry และยกเลิกคำขอเมื่อเปลี่ยนองค์กร |
| `features/*/data-access/*-api.repository.ts`  | request/response ของแต่ละ feature                   |
| `features/*/data-access/*-data.service.ts`    | สถานะข้อมูล การตรวจฟอร์ม และ mutation               |
| `shared/utils/data-size.ts`                   | แสดง MB/GB/TB; 1 GB = 1,000 MB                      |

ยังไม่ต้องแยกเป็น library/package อิสระ ใช้ interface ใน data-access เป็นจุดเปลี่ยน provider แทนการนำ HTTP ไปไว้ใน component หรือสร้าง generic abstraction เพิ่ม

## Contract ที่ local ใช้งานอยู่

Base URL: `environment.apiBaseUrl + /v1` เช่น `/api/v1` ทุก business request ส่ง `Authorization: Bearer <token>` และ `X-Corporate-ID` แต่ backend ตรวจสิทธิ์จากบัญชีทุกครั้ง ไม่ถือว่า header เป็นสิทธิ์

| HTTP   | Path                               | Request / response                                                         |
| ------ | ---------------------------------- | -------------------------------------------------------------------------- |
| POST   | `/auth/sessions`                   | `{email,password}` → `{accessToken,refreshToken,tokenType,expiresIn,user}` |
| GET    | `/auth/me`                         | ผู้ใช้พร้อม `role` และ `corporates[]`                                      |
| DELETE | `/auth/sessions/current`           | revoke token ปัจจุบัน → 204                                                |
| GET    | `/corporates/{id}`                 | `{numbers,counts}`; URL กับองค์กรที่เลือกต้องตรงกัน                        |
| POST   | `/corporates/{id}/numbers/suspend` | `{ids:string[]}` → 204; ถ้ามี ID ไม่อยู่ในองค์กรจะปฏิเสธทั้งหมด            |
| GET    | `/dashboard`                       | counts, usage, pool, daily usage, activity                                 |
| GET    | `/pools`                           | `DataPool[]` ขององค์กรที่เลือก                                             |
| GET    | `/pools/members`                   | `PoolMember[]`; สถานะเลขหมายล่าสุดจาก Corporate                            |
| GET    | `/pools/transactions`              | `PoolTransaction[]`; ยอดเป็น MB แบบมีเครื่องหมาย                           |
| GET    | `/pools/inventory`                 | `{id,poolId,name}[]`; seed ปัจจุบันว่าง                                    |
| POST   | `/pools`                           | `{name,status}` → 201; quota เริ่ม 0                                       |
| PATCH  | `/pools/{id}`                      | `{name,status}` → 204                                                      |
| POST   | `/pools/{id}/quota-adjustments`    | `{direction,amountMb,reason}` → 204                                        |

ไม่ส่งชื่อผู้ทำรายการหรือชื่อองค์กรใน mutation เพื่อใช้เป็นหลักฐาน Backend กำหนดจากผู้ใช้ที่ยืนยันแล้ว รายละเอียดชนิดข้อมูลอยู่ใน feature models; หัวตารางประวัติใช้ MB/GB อัตโนมัติ ส่วน CSV เป็นค่าดิบ MB พร้อมหัวคอลัมน์บอกหน่วย

Error envelope: `{error:{code,message}}` ใช้ HTTP 400/422 สำหรับ input, 401 session, 403 องค์กรไม่มีสิทธิ์, 404 record ไม่อยู่ในองค์กร, 409 conflict/โควตาไม่พอ, 429 login ถี่เกิน และ 503 dependency ไม่พร้อม Frontend ไม่มี fallback เป็น mock และไม่ retry mutation อัตโนมัติ

## Auth ที่ใช้อยู่และสิ่งที่ยังต้องตกลง

### องค์กรที่ฝ่ายขายดูแล

Admin เลือกองค์กรให้ Sales ได้หลายองค์กรในหน้าสร้าง/แก้ผู้ใช้ โดยส่ง `corporateIds: ["..."]` ไป `POST /users` หรือ `PATCH /users/{id}` ต้องเลือกอย่างน้อยหนึ่งองค์กร หนึ่งองค์กรมี Sales ได้คนเดียว รวมบัญชี pending/inactive; API ตอบ `409 CORPORATE_ALREADY_ASSIGNED` เมื่อชนกัน ฟอร์มจะแสดงข้อความเฉพาะและโหลดข้อมูลผู้ดูแลล่าสุด ห้ามใช้เพียงการ disable ตัวเลือกบน UI เป็นตัวตรวจสิทธิ์

รายการผู้ใช้มี `corporates` สำหรับแสดงองค์กรที่มอบหมายและกรองตาราง Sales เห็นเฉพาะองค์กรที่ได้รับมอบหมายใน session; เปลี่ยน assignment แล้ว token เดิมใช้ไม่ได้ ต้องรับ session ใหม่ผ่าน login/refresh ข้อมูลยังอยู่ใน backend memory และหายเมื่อ restart service

### Session

Login เป็น API จริง โดย provider ใน local ใช้บัญชีทดสอบ JWT HS256 อายุ 15 นาที เก็บใน memory ของ browser เท่านั้น เมื่อรีเฟรชหน้า แอปใช้ refresh token ใน sessionStorage ของแท็บเรียก API เพื่อกู้ session ก่อนเปิด route มี refresh token แบบหมุนเวียน ใช้ครั้งเดียว อายุ session รวมสูงสุด 8 ชั่วโมง; ต่ออายุ access ก่อนหมดอายุ 60 วินาที Identity รองรับ key ring แต่ค่าเริ่มต้นยังสุ่ม key ต่อ process; session/rate limit อยู่ใน local adapter; service อื่นตรวจ session กับ Identity: คำขอเขียนตรวจทุกครั้งจึงปฏิเสธ token ที่ Logout แล้วทันที ส่วนคำขออ่านใช้ผลที่ cache ไว้ได้ไม่เกิน `IDENTITY_AUTH_CACHE_SECONDS` (ค่าเริ่มต้น 30 วินาที)

dev/prod ยังไม่มี identity/database provider ที่ใช้งานจริง ไม่เปิด local accounts/fixtures อัตโนมัติ ต้องต่อ durable adapters สำหรับ sessions, audit และ idempotency รวมถึง account provider, secrets, OTP email/SMS และ MVNO ก่อน deploy ใช้งานจริง การตัดสินใจแยก DB ยังไม่ถูกบังคับโดยโครงสร้างนี้

หลัง login ไป `/dashboard` เสมอ ส่วน refresh หน้าเดิมใช้ `POST /auth/sessions/refresh` ก่อนเปิด route โดยไม่เชื่อข้อมูลผู้ใช้หรือ role จาก storage เก็บเฉพาะ refresh token ใน sessionStorage; ล้างก่อนส่งคำขอหมุน token และเมื่อ logout/หมดอายุ หาก browser ปิด storage จะใช้งานได้เฉพาะ session ใน memory การ restart Identity local ทำให้ session เดิมใช้ไม่ได้เพราะ backend ยังเป็น memory adapter

sessionStorage อ่านได้ด้วย JavaScript จึงยังไม่ใช่ HttpOnly cookie เมื่อเตรียม production ควรย้าย refresh token ไป cookie ที่ตั้ง HttpOnly/Secure พร้อมการป้องกัน CSRF โดยต้องปรับ API ร่วมกัน

SIM, Packages, Usage, Users, Roles และ Reports ยังเป็นหน้าเริ่มต้น Backend ของโมดูลเหล่านั้นยังตอบ 501 ส่วน Forgot password ยังเป็นหน้าคำแนะนำ และ Notifications ยังไม่เชื่อม API

## Responsive และการตรวจสอบ

Root font ใช้ `clamp(1rem, calc(0.75rem + 0.208333vw), 1.25rem)` ได้ฐาน 16 px บนจอทั่วไปและ 20 px ที่ viewport 3,840 px; ข้อความ 0.875rem จะได้ 14–17.5 px ปรับตาม viewport อัตโนมัติและยังใช้ browser zoom ได้ กราฟใช้ความสูง rem

ตรวจ layout ใน Chromium บน Windows แบบ viewport จำลอง: 320, 390, 768, 1,024, 1,440, 1,920, 2,560 และ 3,840 px ตรวจว่าไม่มีหน้าทั้งหน้าล้นแนวนอน ตารางที่กว้างเลื่อนในกรอบของตาราง ชื่อ device preset ใน DevTools เป็นเพียงขนาดจำลอง ไม่ใช่การรับรองอุปกรณ์หรือ OS นั้น

ยังไม่ได้ทดสอบ Firefox, Safari, iOS จริง, Android จริง, TV remote หรือ browser รุ่นเก่า จึงยังไม่รับรอง iOS 12/14 จากรายการ preset จอ 4K ที่ Windows scaling 200% อาจได้ viewport ใกล้ 1,920 px ซึ่งต้องใช้ layout ตาม viewport จริง

คำสั่งตรวจหลัก: `npm test -- --watch=false`, `npm run build:local`, `npm run build:prod`, `npm run test:deployment`, `npm run format:check` และฝั่ง API `cargo test --workspace`, `cargo clippy --workspace --all-targets -- -D warnings`

ผลตรวจวันที่ 6 พฤศจิกายน 2026: frontend unit tests 22 รายการ, deployment routing tests 3 รายการ, backend tests 25 รายการ และ Clippy ผ่าน ทดสอบ flow กับ backend จริงทั้ง 4 services: Login ทั้ง 3 บัญชี, ปฏิเสธข้ามองค์กร, Admin สลับองค์กร, เพิ่มพูล/โควตา, audit actor, Logout/revoke, สลับภาษาโดยอยู่ route เดิมครบ 11 เมนู และ responsive ตามขนาดข้างต้น

Build local และ build ผ่านเส้นทาง Jenkins (`node scripts/build-ci.mjs prod`) สำเร็จ แต่ production initial bundle มี warning ขนาด 519.30 kB เกิน warning budget 500 kB อยู่ 19.30 kB ยังต่ำกว่า error budget 1 MB ไม่มีการเพิ่ม budget เพื่อซ่อน warning และยังไม่ได้ deploy AWS

## Request safety

- `ApiClient` ส่ง UUID `Idempotency-Key` สำหรับ business POST/PATCH ที่มี corporate ID; ไม่ส่งสำหรับ auth
- `MutationKeys` เก็บ key หลัง timeout/network/5xx และใช้ซ้ำกับคำสั่งเดิม (ผู้ใช้/องค์กร/method/path/body ตรงกัน) ล้างหลังผลสำเร็จหรือ definitive 4xx ไม่ retry อัตโนมัติ
- Reload/logout ทำให้ pending keys หาย จึงต้องตรวจข้อมูลล่าสุดก่อนส่งคำสั่งที่ไม่ทราบผลอีกครั้ง Server local dedup อยู่ได้ 24 ชั่วโมงและหายเมื่อ restart
- `SessionRefresh` มี refresh ได้ครั้งเดียวในเวลาเดียวกัน เมื่อ refresh ล้มเหลวให้ sign in ใหม่เพื่อไม่ replay refresh token ที่อาจถูกใช้ไปแล้ว
- ไม่แสดง Support reference บนหน้าจอแล้ว; ข้อความ error ของแต่ละฟอร์มยังแสดงตามเดิม หากต้องเชื่อมกับ backend log ให้ดู `X-Request-ID` / `X-Trace-ID` ที่ Network → Response Headers
- `requestTimeout` แยกจาก connection error และมีข้อความทั้ง EN/TH
- Backend ตรวจ permissions ทุกครั้ง (admin/corporate/sales); UI ไม่ใช่ตัวบังคับสิทธิ์
- `GET /auth/me` เพิ่ม `permissions`; `POST /auth/sessions/refresh` รับ `{refreshToken}` และคืน session รูปแบบเดียวกับ login

ทดสอบ Angular ด้วย `npm test -- --watch=false`; หาก Windows sandbox ไม่ยอม rename cache ใน TEMP ให้ตั้ง `TEMP` และ `TMP` ไป `.angular/test-tmp` สำหรับ process ทดสอบเท่านั้น
