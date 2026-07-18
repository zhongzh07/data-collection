"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    // 若开启了邮箱确认，可能没有 session
    if (!data.session) {
      setMessage("注册成功。若项目开启了邮箱确认，请先到邮箱点开确认链接，再登录。");
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen w-full bg-[#f7f3d8] bg-[linear-gradient(rgba(112,175,138,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(112,175,138,0.14)_1px,transparent_1px)] bg-[length:18px_18px] px-5 py-8 text-[#073332] sm:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(360px,420px)]">
        <section className="hidden rounded-[7px] border-2 border-[#abc3b9] bg-[#fffff3]/80 p-6 shadow-[5px_6px_0_rgba(31,67,57,0.16)] backdrop-blur lg:block">
          <span className="inline-flex min-h-8 items-center rounded-[6px] border-2 border-[#e6cc8d] bg-[#fffbea] px-3 text-xs font-black text-[#825d08]">
            种种酒馆
          </span>
          <h1 className="mt-5 max-w-sm text-4xl font-black leading-tight tracking-normal text-[#073332]">
            建一个采集身份
          </h1>
          <p className="mt-4 max-w-md text-sm font-bold leading-7 text-[#53645e]">
            注册后会自动创建 profile，后续提交都按当前用户进入自己的数据空间。
          </p>
          <div className="mt-8 grid grid-cols-3 gap-3 text-xs font-black text-[#173f3c]">
            <div className="rounded-[7px] border-2 border-[#c5d6c9] bg-[#efffe2] p-3">
              User
            </div>
            <div className="rounded-[7px] border-2 border-[#d6c488] bg-[#fff7d5] p-3">
              Profile
            </div>
            <div className="rounded-[7px] border-2 border-[#e8b5a6] bg-[#fff0ea] p-3">
              Entries
            </div>
          </div>
        </section>

        <section className="rounded-[7px] border-2 border-[#abc3b9] bg-[#fffff3]/90 p-5 shadow-[5px_6px_0_rgba(31,67,57,0.16)] backdrop-blur sm:p-7">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black text-[#825d08]">data-collection</p>
              <h2 className="mt-2 text-2xl font-black tracking-normal text-[#073332]">
                注册
              </h2>
            </div>
            <span className="grid h-12 w-12 place-items-center rounded-full border-[3px] border-[#1f7466] bg-[#dff6df] text-lg font-black text-[#173f3c]">
              新
            </span>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-black text-[#173f3c]">邮箱</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="min-h-11 rounded-[6px] border-2 border-[#c6d3c0] bg-[#fffdf0] px-3 text-[#073332] outline-none transition focus:border-[#2e946a] focus:ring-2 focus:ring-[#2e946a]/20"
                placeholder="you@example.com"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-black text-[#173f3c]">密码</span>
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="min-h-11 rounded-[6px] border-2 border-[#c6d3c0] bg-[#fffdf0] px-3 text-[#073332] outline-none transition focus:border-[#2e946a] focus:ring-2 focus:ring-[#2e946a]/20"
                placeholder="至少 6 位"
              />
            </label>

            {error ? (
              <p className="rounded-[6px] border-2 border-[#e8b5a6] bg-[#fff0ea] px-3 py-2 text-sm font-bold text-[#9b3d29]">
                {error}
              </p>
            ) : null}
            {message ? (
              <p className="rounded-[6px] border-2 border-[#c5d6c9] bg-[#efffe2] px-3 py-2 text-sm font-bold text-[#173f3c]">
                {message}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 min-h-11 rounded-[7px] border-2 border-[#145b4f] bg-[#2e946a] px-4 py-2 text-sm font-black text-white shadow-[inset_0_-3px_0_rgba(0,0,0,0.16)] transition hover:brightness-95 disabled:opacity-60"
            >
              {loading ? "注册中..." : "创建账号"}
            </button>
          </form>

          <p className="mt-5 text-sm font-bold text-[#53645e]">
            已有账号？{" "}
            <Link href="/login" className="font-black text-[#2e946a] underline">
              登录
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
