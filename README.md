# Voice Notes AI

Ứng dụng Expo ghi âm, chuyển giọng nói thành văn bản và **tóm tắt bằng AI (DeepSeek / Grok)**.
Mọi dữ liệu (file ghi âm, bản ghi, bản tóm tắt) được lưu **trên máy** — không có backend.

## Tính năng

- **4 tab:** Ghi chú · Thư mục · Việc cần làm · Cài đặt (thanh tab native, liquid glass trên iOS 26).
- **Thêm:** nút ghi âm nổi giữa màn hình, tải lên file âm thanh, hoặc viết / dán văn bản. Khi ghi âm
  bấm 🔖 để **đánh dấu mốc** quan trọng; trong ghi chú bấm vào mốc để nghe lại đúng đoạn đó.
- **AI:** tự chuyển giọng nói → văn bản → tóm tắt và đặt tiêu đề. 4 kiểu tóm tắt: Ngắn gọn, Chi tiết,
  Biên bản họp, Ghi chép học tập — chọn lại kiểu ngay trong ghi chú khi bấm "Tóm tắt lại".
- **✨ Hỏi AI:** trò chuyện với AI về nội dung từng ghi chú (ý chính, ai làm gì, soạn email, câu hỏi ôn tập…).
- **Thư mục:** tạo thư mục với màu và biểu tượng, chuyển ghi chú giữa các thư mục, ghi âm thẳng vào thư mục.
- **Việc cần làm:** gom mọi ô "- [ ]" trong các bản tóm tắt thành một danh sách, có tiến độ %, bấm để đánh dấu xong.
- **Sửa:** tiêu đề, trình chỉnh sửa tóm tắt (tiêu đề, in đậm, danh sách, việc cần làm), sửa bản ghi, gắn thẻ.
- **Tìm kiếm & lọc:** theo nội dung, thư mục, loại, thẻ; sắp xếp; chọn nhiều để yêu thích / xóa hàng loạt.
- **Thùng rác** có khôi phục, tự xóa sau 30 ngày. Trình phát có tua ±10 giây và tốc độ 0.75x–2x.

## Cách hoạt động

```
Ghi âm (iPhone: WAV, Android: m4a) / tải file ─► lưu vào thư mục document của app
  ─► giải mã trên máy → WAV 16 kHz mono, chia đoạn 2 phút
     (react-native-audio-api; không có nó thì WAV đọc bằng JS, MP3 nhỏ gửi thẳng)
  ─► gemini-3.7-flash (dự phòng gemini-3.6-flash)          : âm thanh → văn bản
  ─► deepseek-v4-pro  (dự phòng grok-4.7, hoặc ngược lại)   : văn bản → tiêu đề + tóm tắt
  ─► lưu vào AsyncStorage
```

Tất cả đi qua một AI gateway tương thích OpenAI. DeepSeek và Grok chỉ đọc được chữ, nên bước
nghe âm thanh dùng Gemini. Gateway chỉ nhận âm thanh **WAV/MP3**, vì vậy app tự chuyển file sang
WAV trước khi gửi (gửi m4a sẽ bị lỗi 500).

## Cấu hình AI (một lần cho cả dự án)

Người dùng không cần nhập gì. Cấu hình nằm trong `.env.local` (git bỏ qua; mẫu ở `.env.example`):

```
EXPO_PUBLIC_AI_BASE_URL=https://hhtechapi.com/v1
EXPO_PUBLIC_AI_API_KEY=sk-...
EXPO_PUBLIC_DEEPSEEK_MODEL=deepseek-v4-pro
EXPO_PUBLIC_GROK_MODEL=grok-4.7
EXPO_PUBLIC_TRANSCRIBE_MODEL=gemini-3.7-flash,gemini-3.6-flash
```

Đổi tên model ở đây là được (xem danh sách bằng `GET /v1/models`). Sau khi sửa, **khởi động lại**
`npx expo start`.

## Chạy app

Bước giải mã âm thanh dùng thư viện native nên cần **development build** (build một lần, sau đó
sửa code vẫn tự tải lại như Expo Go):

```bash
npm install
npx expo run:android          # cần Android Studio
# hoặc build trên cloud, nhận file APK:
npx eas-cli build --profile development --platform android
npx expo start
```

- **Expo Go** vẫn dùng được mọi chức năng. Chuyển giọng nói trong Expo Go: ghi âm trên **iPhone**
  (ghi thẳng ra WAV) và file tải lên dạng **WAV** hoặc **MP3 ≤ 8 MB** đều được; ghi âm trên
  **Android** và file **m4a/aac** cần development build (app sẽ báo rõ khi gặp trường hợp này).
- **Web** (`npx expo start --web`) chạy đầy đủ, kể cả chuyển giọng nói — trình duyệt tự giải mã âm thanh.
  Gateway chặn CORS từ trình duyệt nên bản web dev gọi qua proxy `/__ai` trong `metro.config.js`.

## Cấu trúc

```
src/app/            màn hình (Expo Router)
  (tabs)/           index (ghi chú), folders, tasks, settings — thanh tab native
  note/[id].tsx     chi tiết: nghe lại, mốc, thẻ, tóm tắt, bản ghi, Hỏi AI
  folder/[id].tsx   ghi chú trong một thư mục;  folder-edit.tsx  tạo / sửa thư mục
  record.tsx        ghi âm (có đánh dấu mốc);  new-text.tsx  ghi chú văn bản;  trash.tsx
src/components/     screen-header (tiêu đề theo safe area), note-card, add-actions, sheet,
                    summary-editor, markdown-view, note-chat, tag-editor, audio-player, ui
src/lib/
  config.ts         đọc cấu hình AI từ .env.local
  ai-client.ts      gọi /chat/completions, thử lại + model dự phòng
  transcribe.ts     giải mã → WAV → chia đoạn → Gemini
  summarize.ts      DeepSeek / Grok
  audio-decode*.ts  giải mã âm thanh (native / web), wav.ts mã hóa WAV
  notes-store.ts    lưu ghi chú, thùng rác, thẻ;  folders-store.ts  thư mục
  tasks.ts          gom việc cần làm;  note-chat.ts  Hỏi AI
```

## Lưu ý

- Ghi âm tối đa 90 phút mỗi file.
- Bản web chỉ để thử: file ghi âm trên web không được giữ lại sau khi tải lại trang.
- Gateway đôi khi trả lỗi 503 với Gemini; app tự thử lại và chuyển model dự phòng, nếu vẫn lỗi
  thì ghi chú hiện nút "Thử lại".
- Vì không có backend, API key trong `.env.local` được đóng gói vào app (biến `EXPO_PUBLIC_*`):
  ai có file cài đặt đều có thể trích ra. Phù hợp cho đồ án / demo; nếu phát hành công khai
  hãy đặt giới hạn chi tiêu cho key hoặc chuyển lời gọi AI qua một máy chủ trung gian.
