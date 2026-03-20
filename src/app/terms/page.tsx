export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: March 20, 2026</p>

      <div className="space-y-6 text-gray-700 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">1. Acceptance of Terms</h2>
          <p>By accessing and using markethubpromo.com ("Service"), you accept and agree to be bound by these Terms of Service. If you do not agree, please do not use our Service.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">2. Description of Service</h2>
          <p>MarketHub Pro provides social video intelligence and analytics services, aggregating publicly available data from social media platforms including YouTube and TikTok for content creators and marketers.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">3. Use of Service</h2>
          <p>You agree to use the Service only for lawful purposes and in accordance with these Terms. You may not use the Service to violate any laws or regulations.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">4. API Usage</h2>
          <p>Our Service uses YouTube Data API and TikTok API. Usage is subject to their respective Terms of Service: <a href="https://developers.google.com/youtube/terms/api-services-terms-of-service" className="text-[#39D3B8]">YouTube API Terms</a> and <a href="https://www.tiktok.com/legal/developer-terms-of-service" className="text-[#39D3B8]">TikTok Developer Terms</a>.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">5. Intellectual Property</h2>
          <p>The Service and its original content, features, and functionality are owned by MarketHub Pro and are protected by international copyright, trademark, and other intellectual property laws.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">6. Disclaimer</h2>
          <p>The Service is provided "as is" without warranties of any kind. Analytics data is sourced from public APIs and may not be 100% accurate or real-time.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">7. Limitation of Liability</h2>
          <p>MarketHub Pro shall not be liable for any indirect, incidental, special, or consequential damages resulting from your use of the Service.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">8. Changes to Terms</h2>
          <p>We reserve the right to modify these terms at any time. Continued use of the Service after changes constitutes acceptance of the new terms.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">9. Contact</h2>
          <p>Questions about these Terms should be sent to: <a href="mailto:contact@markethubpromo.com" className="text-[#39D3B8]">contact@markethubpromo.com</a></p>
        </section>
      </div>
    </div>
  );
}
