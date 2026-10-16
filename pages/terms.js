import Navbar from "../components/Navbar";
import Head from "next/head";

export const metadata = {
  title: "服务条款 — Weacond",
  robots: { index: false },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head><title>服务条款 — Weacond</title></Head>
      <Navbar />
      <section className="pt-28 pb-16 px-4">
        <div className="max-w-3xl mx-auto bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
          <h1 className="text-3xl font-bold mb-2">服务条款</h1>
          <p className="text-sm text-slate-400 mb-8">最后更新：2026年10月</p>

          <div className="space-y-6 text-sm text-slate-700 leading-relaxed">
            <section>
              <h2 className="text-lg font-bold mb-2">1. 服务说明</h2>
              <p>Weacond（以下简称"平台"）提供金融数据分析、教育内容和策略工具。所有内容和信号仅供教育和研究用途，不构成投资建议、财务建议或交易建议。</p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-2">2. 免责声明</h2>
              <p>用户理解并同意：(a) 平台不提供个性化投资咨询；(b) 历史回测结果不代表未来表现；(c) 信号和策略有风险，可能导致亏损；(d) 投资有风险，入市需谨慎。使用平台即表示您已阅读并同意此免责声明。</p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-2">3. 账户与注册</h2>
              <p>用户需提供真实、准确的注册信息。每个用户只能拥有一个账户。平台保留在发现欺诈行为时关闭账户的权利。</p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-2">4. 订阅与退款</h2>
              <p>订阅按月/年计费，自动续费。7天内无条件退款（年付首次及活动除外）。退款处理时间不超过24小时。年付不可部分退款。</p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-2">5. API 使用条款</h2>
              <p>API 使用受速率限制约束。禁止：(a) 反向工程；(b) 用于违法目的；(c) 超出套餐配额的使用。平台保留在滥用时终止 API 访问的权利。API 数据不得二次分发。</p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-2">6. 创作者与策略市场</h2>
              <p>上架策略须：(a) 保证原创性；(b) 披露回测假设；(c) 标注风险等级；(d) 同意平台分润条款（默认 50%/30%/20%）。抄袭或违规将被下线并保留仲裁权。</p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-2">7. 数据与隐私</h2>
              <p>详见<a href="/privacy" className="text-indigo-600 underline">隐私政策</a>。平台采用数据最小化原则，敏感数据加密存储。</p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-2">8. 知识产权</h2>
              <p>平台所有内容、代码、设计归 Weacond 所有。用户不得复制、修改或分发。开源组件遵循其各自许可证（Apache 2.0 / MIT）。</p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-2">9. 责任限制</h2>
              <p>平台按"现状"提供，不做任何保证。在任何情况下，平台对因使用本服务导致的直接、间接、附带损害不承担责任，包括投资损失。总责任上限为最近 12 个月支付金额。</p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-2">10. 争议解决</h2>
              <p>因本服务产生的争议，双方同意通过友好协商解决。协商不成，提交平台所在地有管辖权的法院。适用法律为平台注册地法律。</p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-2">11. 金融合规</h2>
              <p>平台不提供代客理财、代下单服务。复制交易功能在上线前须完成牌照申请。KYC/AML 在涉及托管/大额/自动交易时启用。</p>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}