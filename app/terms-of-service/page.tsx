import Link from "next/link"

export default function TermsOfService() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Terms of Service</h1>
      <p className="mb-4">Last updated: {new Date().toLocaleDateString()}</p>
      <p className="mb-4">
        These Terms of Service ("Terms") govern your use of the News On Africa website and services. By using our
        services, you agree to these Terms.
      </p>
      <h2 className="text-2xl font-bold mt-6 mb-2">Use of Our Services</h2>
      <p className="mb-4">
        You must follow any policies made available to you within the Services. Don't misuse our Services. For example,
        don't interfere with our Services or try to access them using a method other than the interface and the
        instructions that we provide.
      </p>
      <h2 className="text-2xl font-bold mt-6 mb-2">Privacy</h2>
      <p className="mb-4">
        News On Africa's privacy policies explain how we treat your personal data and protect your privacy when you use
        our Services. By using our Services, you agree that News On Africa can use such data in accordance with our
        privacy policies.
      </p>
      <h2 className="text-2xl font-bold mt-6 mb-2">Copyright</h2>
      <p className="mb-4">
        The content on our website is protected by copyright. You may not use, reproduce, distribute, or create
        derivative works from this content without express written permission from News On Africa.
      </p>
      <h2 className="text-2xl font-bold mt-6 mb-2">Termination</h2>
      <p className="mb-4">
        We may suspend or stop providing our Services to you if you do not comply with our terms or policies or if we
        are investigating suspected misconduct.
      </p>
      <h2 className="text-2xl font-bold mt-6 mb-2">Liability for our Services</h2>
      <p className="mb-4">
        When permitted by law, News On Africa will not be responsible for lost profits, revenues, or data, financial
        losses or indirect, special, consequential, exemplary, or punitive damages.
      </p>
      <h2 className="text-2xl font-bold mt-6 mb-2">Changes to These Terms</h2>
      <p className="mb-4">
        We may modify these terms or any additional terms that apply to a Service to, for example, reflect changes to
        the law or changes to our Services.
      </p>
      <Link href="/" className="text-blue-600 hover:underline">
        Return to Home
      </Link>
    </div>
  )
}
