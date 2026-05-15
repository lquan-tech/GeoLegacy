# 🌍 GeoLegacy

> **Khám phá lịch sử nhân loại trên quả địa cầu 3D tương tác**

GeoLegacy là một ứng dụng web cho phép người dùng khám phá các địa danh lịch sử của thế giới thông qua một quả địa cầu 3D sống động. Người dùng có thể tìm kiếm, lọc theo thời đại, xem chi tiết từng địa danh, đăng nhập để đóng góp địa điểm mới, đánh dấu bookmark, và chia sẻ vị trí qua link.

---

## 📸 Tính năng nổi bật

- 🌐 **Quả địa cầu 3D** — xoay, zoom, và nhấp vào từng điểm lịch sử trực tiếp trên bản đồ
- 🔍 **Tìm kiếm thông minh** — tìm theo tên, địa điểm, thời đại, mô tả, hoặc tác giả
- ⏳ **Lọc theo thời đại** — Ancient / Classical / Medieval / Early Modern
- 📍 **Side Panel chi tiết** — ảnh, mô tả, thời đại, bình luận, chia sẻ link
- 💬 **Hệ thống bình luận** — thêm "field notes" vào từng địa danh
- 🔖 **Bookmark** — lưu địa danh yêu thích
- 🔗 **Chia sẻ permalink** — mỗi địa danh có URL riêng (`?site=id`)
- 👤 **Đăng nhập / Đăng ký** — xác thực qua Supabase (hỗ trợ Google OAuth)
- ➕ **Đóng góp địa danh** — người dùng đăng nhập có thể submit địa điểm mới để kiểm duyệt
- 📱 **Responsive** — hoạt động tốt trên cả desktop lẫn mobile

---

## 🛠️ Công nghệ sử dụng

| Công nghệ | Vai trò |
|---|---|
| [React 18](https://react.dev/) | Framework UI |
| [Vite 6](https://vitejs.dev/) | Build tool & Dev server |
| [Tailwind CSS 4](https://tailwindcss.com/) | Styling |
| [react-globe.gl](https://github.com/vasturiano/react-globe.gl) | Quả địa cầu 3D (WebGL + Three.js) |
| [Framer Motion](https://www.framer.com/motion/) | Animation (side panel, modal) |
| [Zustand](https://zustand-demo.pmnd.rs/) | Quản lý state toàn cục |
| [Supabase](https://supabase.com/) | Backend: Auth, Database (PostgreSQL), Storage |
| [Lucide React](https://lucide.dev/) | Icon library |

---

## 📁 Cấu trúc thư mục

```
GeoLegacy/
├── src/
│   ├── components/         # Các component UI
│   │   ├── AppHeader.jsx       # Thanh header (tìm kiếm, bộ lọc, nút thêm địa danh)
│   │   ├── AppShell.jsx        # Layout bọc ngoài toàn app
│   │   ├── AuthModal.jsx       # Modal đăng nhập / đăng ký
│   │   ├── AuthProvider.jsx    # Quản lý session Supabase
│   │   ├── EraFilter.jsx       # Bộ lọc thời đại (Ancient, Medieval...)
│   │   ├── GlobeComponent.jsx  # Quả địa cầu 3D chính
│   │   ├── ProfileModal.jsx    # Modal chỉnh sửa hồ sơ cá nhân
│   │   ├── SidePanel.jsx       # Panel chi tiết địa danh (bên phải)
│   │   ├── Toast.jsx           # Thông báo popup (success, error...)
│   │   ├── Tooltip.jsx         # Tooltip hover
│   │   ├── UploadModal.jsx     # Modal thêm địa danh mới
│   │   └── UserMenu.jsx        # Menu người dùng (avatar, logout)
│   │
│   ├── data/
│   │   └── landmarks.js        # Dữ liệu mẫu địa danh ban đầu
│   │
│   ├── hooks/
│   │   ├── useMediaQuery.js    # Hook kiểm tra kích thước màn hình
│   │   └── useWindowSize.js    # Hook lấy width/height cửa sổ
│   │
│   ├── lib/
│   │   └── supabaseClient.js   # Khởi tạo Supabase client
│   │
│   ├── services/
│   │   ├── auth.js             # Hàm đăng nhập, đăng ký, đăng xuất
│   │   ├── geocoding.js        # Chuyển đổi tên địa điểm sang tọa độ
│   │   └── landmarks.js        # CRUD địa danh với Supabase
│   │
│   ├── store/
│   │   └── useStore.js         # Zustand store — quản lý toàn bộ state ứng dụng
│   │
│   ├── App.jsx                 # Component gốc, kết nối tất cả
│   ├── index.css               # CSS global & custom styles
│   └── main.jsx                # Entry point React
│
├── supabase/
│   ├── schema.sql              # Toàn bộ SQL: bảng, RLS, trigger, storage
│   └── verify_setup.sql        # Script kiểm tra cài đặt Supabase
│
├── .env.example                # Mẫu biến môi trường (copy thành .env)
├── .gitignore
├── index.html
├── package.json
├── tailwind.config.js
└── vite.config.js
```

---

## ⚙️ Cài đặt & Chạy local

### Yêu cầu
- [Node.js](https://nodejs.org/) phiên bản **18 trở lên**
- Tài khoản [Supabase](https://supabase.com/) (miễn phí)

### Bước 1 — Clone project

```bash
git clone https://github.com/lquan-tech/GeoLegacy.git
cd GeoLegacy
```

### Bước 2 — Cài đặt dependencies

```bash
npm install
```

### Bước 3 — Cấu hình Supabase

1. Tạo project mới tại [supabase.com](https://supabase.com/)
2. Vào **SQL Editor** trong dashboard Supabase, chạy toàn bộ nội dung file `supabase/schema.sql`
3. Copy file `.env.example` thành `.env`:

```bash
copy .env.example .env
```

4. Điền thông tin vào file `.env`:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_AUTH_REDIRECT_URL=http://localhost:5173/
```

> 💡 Lấy `SUPABASE_URL` và `SUPABASE_ANON_KEY` tại: Dashboard Supabase → **Settings** → **API**

### Bước 4 — Chạy dev server

```bash
npm run dev
```

Mở trình duyệt và truy cập: **http://localhost:5173**

---

## 🗄️ Cơ sở dữ liệu (Supabase)

Chạy file `supabase/schema.sql` để tạo toàn bộ cấu trúc:

### Các bảng chính

| Bảng | Mô tả |
|---|---|
| `profiles` | Hồ sơ người dùng (username, display_name, avatar, role) |
| `landmarks` | Địa danh lịch sử (title, description, lat, lng, era, status) |
| `comments` | Bình luận của người dùng trên từng địa danh |
| `bookmarks` | Danh sách địa danh đã bookmark của mỗi user |

### Trạng thái địa danh

- **`pending`** — vừa được user submit, đang chờ admin kiểm duyệt
- **`published`** — đã được duyệt, hiển thị công khai trên bản đồ

### Bảo mật (Row Level Security)

Supabase RLS được bật cho tất cả bảng:
- Ai cũng có thể **xem** địa danh đã published
- Chỉ người dùng **đã đăng nhập** mới có thể submit địa danh, bình luận, bookmark
- Người dùng chỉ có thể **sửa/xóa** dữ liệu của chính mình
- **Admin** có quyền kiểm duyệt và cập nhật mọi địa danh

### Storage

Bucket `landmark-images` để lưu ảnh địa danh:
- Dung lượng tối đa: **5MB/ảnh**
- Định dạng hỗ trợ: `image/jpeg`, `image/png`, `image/webp`

---

## 🚀 Build production

```bash
npm run build
```

File build xuất ra thư mục `dist/`. Có thể deploy lên:
- [Vercel](https://vercel.com/) (khuyến nghị — kéo thả repo GitHub là xong)
- [Netlify](https://netlify.com/)
- [GitHub Pages](https://pages.github.com/)

---

## 🔐 Biến môi trường

| Biến | Mô tả | Bắt buộc |
|---|---|---|
| `VITE_SUPABASE_URL` | URL project Supabase | ✅ |
| `VITE_SUPABASE_ANON_KEY` | Anon key (public) của Supabase | ✅ |
| `VITE_AUTH_REDIRECT_URL` | URL redirect fallback khi chạy ngoài browser | ❌ |

> ⚠️ **Không bao giờ commit file `.env` lên GitHub!** File này đã được `.gitignore` bảo vệ.

---

## 🧩 Luồng hoạt động chính

```
Người dùng mở web
    → Globe 3D tự xoay, hiển thị các pin địa danh
    → Click vào pin → Side Panel mở ra với thông tin chi tiết
    → Có thể tìm kiếm / lọc theo thời đại ở thanh Header
    → Đăng nhập → có thể bookmark, bình luận, submit địa danh mới
    → Submit địa danh → status "pending" → admin duyệt → "published"
```

---

## 🤝 Đóng góp

1. Fork repo này
2. Tạo branch mới: `git checkout -b feature/ten-tinh-nang`
3. Commit thay đổi: `git commit -m "Add: mô tả thay đổi"`
4. Push lên: `git push origin feature/ten-tinh-nang`
5. Tạo Pull Request

---

## 📄 License

MIT — Tự do sử dụng, chỉnh sửa và phân phối.
