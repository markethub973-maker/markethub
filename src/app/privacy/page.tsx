export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: March 20, 2026</p>

      <div className="space-y-6 text-gray-700 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">1. Information We Collect</h2>
          <p>MarketHub Pro ("we", "us", or "our") operates markethubpromo.com. We collect information you provide directly to us and data from public social media platforms including YouTube and TikTok for analytics purposes.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">2. How We Use Information</h2>
          <p>We use the information we collect to provide, maintain, and improve our services, including displaying social media analytics and trending content data.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">3. Data from Social Platforms</h2>
          <p>Our platform accesses publicly available data from YouTube (via Google APIs) and TikTok (via TikTok APIs) in accordance with their respective Terms of Service and API policies. We do not store personal data from social media users.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">4. Cookies</h2>
          <p>We use cookies to improve user experience. You may disable cookies in your browser settings, though this may affect functionality.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">5. Third-Party Services</h2>
          <p>We use Vercel for hosting and Google/TikTok APIs for data. These services have their own privacy policies.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">6. Data Security</h2>
          <p>We implement appropriate security measures to protect your information. No method of transmission over the Internet is 100% secure.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">7. Contact Us</h2>
          <p>If you have questions about this Privacy Policy, please contact us at: <a href="mailto:contact@markethubpromo.com" className="text-[#39D3B8]">contact@markethubpromo.com</a></p>
        </section>
      </div>
    </div>
  );
}
