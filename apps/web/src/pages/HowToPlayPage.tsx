import { Link } from 'react-router-dom';

export function HowToPlayPage() {
  return (
    <article className="min-h-screen px-4 py-8 max-w-3xl mx-auto">
      <Link to="/" className="text-sm underline text-text-muted">
        ← Quay lại
      </Link>
      <h1 className="font-display text-3xl mt-4">Hướng dẫn luật cờ gánh</h1>

      <Section title="1. Bàn cờ">
        <p>
          Bàn 5×5 = 25 điểm giao. Mỗi bên có 8 quân, đặt ở rìa bàn. Đường nối: ngang, dọc, và chéo
          tại các điểm có (r+c) chẵn.
        </p>
      </Section>

      <Section title="2. Di chuyển">
        <p>
          Mỗi lượt người chơi di chuyển 1 quân tới điểm trống kề (theo đường nối). Đen đi trước.
        </p>
      </Section>

      <Section title="3. Gánh">
        <p>
          Khi 1 quân vừa di chuyển nằm giữa 2 quân đối phương trên cùng 1 đường thẳng
          (ngang/dọc/chéo nếu áp dụng), 2 quân đối phương đó bị gánh — đổi sang màu của quân vừa đi.
          Không phản ứng dây chuyền.
        </p>
      </Section>

      <Section title="4. Vây (chẹt)">
        <p>
          Sau khi xử lý gánh, nếu một nhóm liên thông quân đối phương không còn nước đi nào (mọi ô
          kề đều có quân) → cả nhóm đổi màu.
        </p>
      </Section>

      <Section title="5. Kết thúc ván">
        <ul className="list-disc list-inside space-y-1">
          <li>Một bên còn 0 quân → bên đó thua.</li>
          <li>Lặp thế cờ 3 lần → hòa.</li>
          <li>50 nước liên tiếp không có gánh/vây → hòa.</li>
          <li>Bên đang đi không còn nước hợp lệ → hòa.</li>
        </ul>
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="font-display text-xl mb-2">{title}</h2>
      <div className="text-sm leading-relaxed">{children}</div>
    </section>
  );
}
