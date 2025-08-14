import Link from 'next/link';

export default function PrivacyPolicy() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Privacy Policy</h1>
      <p className="mb-4">Last updated: {new Date().toLocaleDateString()}</p>
      <p className="mb-4">
        This Privacy Policy describes how News On Africa (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) collects, uses, and
        shares your personal information when you use our website and services.
      </p>
      <h2 className="text-2xl font-bold mt-6 mb-2">Information We Collect</h2>
      <p className="mb-4">
        We collect information you provide directly to us, such as when you create an account,
        subscribe to our newsletter, or contact us for support.
      </p>
      <h2 className="text-2xl font-bold mt-6 mb-2">How We Use Your Information</h2>
      <p className="mb-4">
        We use the information we collect to provide, maintain, and improve our services, to
        communicate with you, and to personalize your experience.
      </p>
      <h2 className="text-2xl font-bold mt-6 mb-2">Sharing Your Information</h2>
      <p className="mb-4">
        We do not sell your personal information. We may share your information with third-party
        service providers who perform services on our behalf.
      </p>
      <h2 className="text-2xl font-bold mt-6 mb-2">Your Rights</h2>
      <p className="mb-4">
        You have the right to access, correct, or delete your personal information. You can also opt
        out of certain data collection and use.
      </p>
      <h2 className="text-2xl font-bold mt-6 mb-2">Changes to This Policy</h2>
      <p className="mb-4">
        We may update this privacy policy from time to time. We will notify you of any changes by
        posting the new policy on this page.
      </p>
      <h2 className="text-2xl font-bold mt-6 mb-2">Contact Us</h2>
      <p className="mb-4">
        If you have any questions about this privacy policy, please contact us at
        privacy@newsonafrica.com.
      </p>
      <Link href="/" className="text-blue-600 hover:underline">
        Return to Home
      </Link>
    </div>
  );
}
