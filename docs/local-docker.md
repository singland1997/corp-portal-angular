# รันผ่าน Docker Compose

[กลับหน้า README](../README.md)

## รันผ่าน Docker Compose ในเครื่อง

Docker เก็บไว้สำหรับทดลองไฟล์ที่ build แล้ว ใช้ Linux containers และ Docker Compose v2 สร้างไฟล์ค่าจากตัวอย่างเมื่อ checkout ใหม่ โดยไม่เขียนทับไฟล์ที่ตั้งค่าไว้แล้ว:

```powershell
Copy-Item .env.local.example .env.local
Copy-Item .env.dev.example .env.dev
Copy-Item .env.prod.example .env.prod
```

```sh
# ตรวจค่าและเปิด local ที่ http://localhost:8082
docker compose --env-file .env.local config
docker compose --env-file .env.local up -d --build

# ตรวจค่าและเปิด dev ที่ http://localhost:8081
docker compose --env-file .env.dev config
docker compose --env-file .env.dev up -d --build

# ตรวจค่าและเปิด prod ที่ http://localhost:8080
docker compose --env-file .env.prod config
docker compose --env-file .env.prod up -d --build

# ดู log และหยุด โดยใช้ env เดียวกับตอนเปิด
docker compose --env-file .env.dev logs -f app
docker compose --env-file .env.local down
docker compose --env-file .env.dev down
docker compose --env-file .env.prod down
```

| ตัวแปร                 | ความหมาย                                                  |
| ---------------------- | --------------------------------------------------------- |
| `COMPOSE_PROJECT_NAME` | แยกชื่อโปรเจกต์/container/network ของ local, dev และ prod |
| `BUILD_CONFIGURATION`  | `local`, `dev` หรือ `prod`                                |
| `IMAGE_TAG`            | tag ของ image                                             |
| `HOST_BIND_ADDRESS`    | ค่าเริ่มต้น `127.0.0.1`                                   |
| `PORT`                 | พอร์ตบน host ที่ส่งต่อเข้า container พอร์ต 8080           |

`.env.local`, `.env.dev` และ `.env.prod` ไม่ถูกเก็บใน Git; Compose ไม่ระบุค่าใช้ `local` พอร์ต 8082 ส่วน Dockerfile ที่ build โดยตรงใช้ `prod` เป็นค่าเริ่มต้น ค่าของ Compose ใช้ควบคุม build/container ไม่ได้เติมค่าเข้า Angular environment อัตโนมัติ ตัวแปรจาก shell มีลำดับความสำคัญสูงกว่า env file และต้อง build ใหม่เมื่อเปลี่ยน Angular settings

Dockerfile ใช้ Node 24 ติดตั้ง dependencies ด้วย `npm ci` แล้ว build จากนั้นคัดลอก browser output ไปเสิร์ฟด้วย `serve@14.2.6` ภายใต้ผู้ใช้ `node` ที่ไม่ใช่ root มี health check ที่ `/index.html` และ `serve.json` กำหนด headers/ปิดการแสดงรายการไฟล์ Compose มีเฉพาะ service `app` ไม่มี Nginx หรือ backend

หากใช้ Nginx ภายนอกในเครื่อง ให้ส่งต่อไป `127.0.0.1:8080` สำหรับ prod, `127.0.0.1:8081` สำหรับ dev หรือ `127.0.0.1:8082` สำหรับ local หาก Nginx อยู่ในอีก container ให้ใช้ network ร่วมและ upstream `app:8080` พร้อมแยกการส่งต่อ API ก่อน SPA fallback

ตัวเสิร์ฟใน container จะ fallback ไป index สำหรับ request ที่หาไม่พบ จึงต่างจากกฎ CloudFront และไม่ได้ใช้ตรวจความถูกต้องของ routing บน AWS แบบครบถ้วน Container ไม่มี live reload; พัฒนาประจำวันด้วย `npm start` ไม่จำเป็นต้องแยก Compose ต่อ environment จนกว่าบริการหรือวิธีรันจะแตกต่างกันจริง
