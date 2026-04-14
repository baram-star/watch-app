"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";

export default function AbsorbPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [books, setBooks] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    book_title: "",
    pages_read: "",
    reading_minutes: "",
    memo: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: profileData } = await supabase
      .from("watch_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!profileData) { router.push("/login"); return; }
    setProfile(profileData);

    const { data: bookData } = await supabase
      .from("watch_reading_logs")
      .select("*")
      .eq("user_id", profileData.id)
      .order("created_at", { ascending: false });

    setBooks(bookData || []);
    setLoading(false);
  }

  async function handleAdd() {
    if (!form.book_title.trim()) return;
    const supabase = createClient();

    const { data } = await supabase
      .from("watch_reading_logs")
      .insert({
        user_id: profile.id,
        book_title: form.book_title,
        pages_read: form.pages_read ? parseInt(form.pages_read) : null,
        reading_minutes: form.reading_minutes ? parseInt(form.reading_minutes) : null,
        memo: form.memo || null,
        started_at: new Date().toISOString().split("T")[0],
      })
      .select()
      .single();

    if (data) {
      setBooks([data, ...books]);
      setForm({ book_title: "", pages_read: "", reading_minutes: "", memo: "" });
      setShowAdd(false);
      setTimeout(() => router.push("/dashboard"), 500);
    }
  }

  async function handleUpdate() {
    if (!editing || !form.book_title.trim()) return;
    const supabase = createClient();

    const { data } = await supabase
      .from("watch_reading_logs")
      .update({
        book_title: form.book_title,
        pages_read: form.pages_read ? parseInt(form.pages_read) : null,
        reading_minutes: form.reading_minutes ? parseInt(form.reading_minutes) : null,
        memo: form.memo || null,
      })
      .eq("id", editing)
      .select()
      .single();

    if (data) {
      setBooks(books.map((b) => (b.id === editing ? data : b)));
      setEditing(null);
      setForm({ book_title: "", pages_read: "", memo: "" });
    }
  }

  async function handleDelete(id) {
    const supabase = createClient();
    await supabase.from("watch_reading_logs").delete().eq("id", id);
    setBooks(books.filter((b) => b.id !== id));
  }

  async function markComplete(book) {
    const supabase = createClient();
    const { data } = await supabase
      .from("watch_reading_logs")
      .update({ completed_at: book.completed_at ? null : new Date().toISOString().split("T")[0] })
      .eq("id", book.id)
      .select()
      .single();

    if (data) {
      setBooks(books.map((b) => (b.id === book.id ? data : b)));
    }
  }

  function startEdit(book) {
    setEditing(book.id);
    setForm({
      book_title: book.book_title,
      pages_read: book.pages_read?.toString() || "",
      reading_minutes: book.reading_minutes?.toString() || "",
      memo: book.memo || "",
    });
    setShowAdd(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-[#0891B2] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const readingBooks = books.filter((b) => !b.completed_at);
  const completedBooks = books.filter((b) => b.completed_at);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-[#0891B2] text-white px-5 pt-12 pb-6 rounded-b-3xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
            <span className="text-white font-bold">A</span>
          </div>
          <div>
            <h1 className="text-xl font-bold">독서 기록</h1>
            <p className="text-cyan-100 text-sm">
              읽고 있는 책 {readingBooks.length}권 · 완독 {completedBooks.length}권
            </p>
          </div>
        </div>
      </header>

      <div className="px-5 mt-6 flex flex-col gap-4">
        {/* 추가 버튼 */}
        {!showAdd && !editing && (
          <button
            onClick={() => { setShowAdd(true); setForm({ book_title: "", pages_read: "", reading_minutes: "", memo: "" }); }}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-gray-300 text-gray-500 font-medium hover:border-[#0891B2] hover:text-[#0891B2] transition-colors"
          >
            + 새 책 추가
          </button>
        )}

        {/* 추가/수정 폼 */}
        {(showAdd || editing) && (
          <div className="bg-white rounded-2xl shadow-sm border border-[#0891B2] p-5 flex flex-col gap-4">
            <h3 className="font-bold text-gray-900">
              {editing ? "독서 기록 수정" : "새 책 추가"}
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">책 제목</label>
              <input
                type="text"
                value={form.book_title}
                onChange={(e) => setForm({ ...form, book_title: e.target.value })}
                placeholder="읽고 있는 책 제목"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]"
              />
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">읽은 페이지</label>
                <input
                  type="number"
                  value={form.pages_read}
                  onChange={(e) => setForm({ ...form, pages_read: e.target.value })}
                  placeholder="페이지 수"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">독서 시간 (분)</label>
                <input
                  type="number"
                  value={form.reading_minutes}
                  onChange={(e) => setForm({ ...form, reading_minutes: e.target.value })}
                  placeholder="예: 30"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">메모</label>
              <textarea
                value={form.memo}
                onChange={(e) => setForm({ ...form, memo: e.target.value })}
                placeholder="인상 깊은 내용이나 느낀 점"
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#0891B2]"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={editing ? handleUpdate : handleAdd}
                className="flex-1 py-3 rounded-xl bg-[#0891B2] text-white font-semibold text-sm"
              >
                {editing ? "수정 완료" : "추가하기"}
              </button>
              <button
                onClick={() => { setShowAdd(false); setEditing(null); }}
                className="px-6 py-3 rounded-xl border border-gray-300 text-gray-600 font-semibold text-sm"
              >
                취소
              </button>
            </div>
          </div>
        )}

        {/* 읽고 있는 책 */}
        {readingBooks.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-gray-500 mb-2">읽고 있는 책</h2>
            <div className="flex flex-col gap-3">
              {readingBooks.map((book) => (
                <div key={book.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">{book.book_title}</h3>
                      <div className="flex gap-3 mt-1">
                        {book.pages_read && (
                          <span className="text-xs text-gray-400">{book.pages_read}p 읽음</span>
                        )}
                        {book.reading_minutes && (
                          <span className="text-xs text-gray-400">{book.reading_minutes}분</span>
                        )}
                        {book.started_at && (
                          <span className="text-xs text-gray-400">
                            {new Date(book.started_at).toLocaleDateString("ko-KR")}~
                          </span>
                        )}
                      </div>
                      {book.memo && (
                        <p className="text-sm text-gray-600 mt-2 bg-gray-50 rounded-lg p-2">
                          {book.memo}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => markComplete(book)}
                      className="flex-1 py-2 rounded-lg bg-[#0891B2] text-white text-xs font-medium"
                    >
                      완독 표시
                    </button>
                    <button
                      onClick={() => startEdit(book)}
                      className="px-4 py-2 rounded-lg border border-gray-200 text-gray-500 text-xs"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(book.id)}
                      className="px-4 py-2 rounded-lg border border-red-200 text-red-400 text-xs"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 완독한 책 */}
        {completedBooks.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-gray-500 mb-2">완독한 책</h2>
            <div className="flex flex-col gap-3">
              {completedBooks.map((book) => (
                <div key={book.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 opacity-70">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#0891B2] flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">{book.book_title}</h3>
                      <span className="text-xs text-gray-400">
                        {book.pages_read && `${book.pages_read}p · `}
                        {book.reading_minutes && `${book.reading_minutes}분 · `}
                        {new Date(book.completed_at).toLocaleDateString("ko-KR")} 완독
                      </span>
                    </div>
                    <button
                      onClick={() => markComplete(book)}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 빈 상태 */}
        {books.length === 0 && !showAdd && (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">📖</p>
            <p className="text-gray-500 text-sm">아직 등록한 책이 없어요</p>
            <p className="text-gray-400 text-xs mt-1">위의 버튼을 눌러 첫 책을 추가해보세요</p>
          </div>
        )}
      </div>

      <BottomNav current="home" />
    </div>
  );
}
