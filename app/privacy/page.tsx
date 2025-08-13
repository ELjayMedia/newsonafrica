import { format } from 'date-fns';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - News On Africa',
  description:
    'Learn about how News On Africa collects, uses, and protects your personal information.',
};

export default function PrivacyPolicy() {
  const lastUpdated = format(new Date(), 'MMMM d, yyyy');

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <article className="prose prose-sm sm:prose lg:prose-lg mx-auto">
        <h1 className="text-3xl font-bold mb-4">Privacy Policy</h1>
        <p className="text-sm text-gray-600 mb-8">Last Updated: {lastUpdated}</p>

        <div className="space-y-6">
          <section>
            <p className="mb-4">
              Welcome to News On Africa ("we," "us," or "our"). This Privacy Policy explains how we
              collect, use, disclose, and safeguard your personal information when you visit or
              interact with our services, including our website, progressive web app (PWA), and any
              other related offerings (collectively, the "Services").
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">1. Scope & Acceptance</h2>
            <p>
              By accessing or using our Services, you acknowledge that you have read, understood,
              and agree to be bound by this Privacy Policy. If you do not agree, please discontinue
              your use of the Services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">2. Information We Collect</h2>
            <h3 className="text-xl font-semibold mt-4 mb-2">
              Personal Information Provided by You
            </h3>
            <ul className="list-disc pl-6 mb-4">
              <li>
                <strong>Account Registration:</strong> When you create an account via Auth0 for
                features like bookmarking or commenting, we may collect personal details such as
                your name, email address, and password.
              </li>
              <li>
                <strong>User-Generated Content:</strong> If you post comments or opinion pieces, we
                may collect the content you submit.
              </li>
              <li>
                <strong>Subscriptions & Newsletters:</strong> If you sign up for our newsletters or
                email alerts, we collect your email address and any additional information you
                voluntarily provide.
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-semibold mt-4 mb-2">Information Collected Automatically</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>
                <strong>Log Data:</strong> We automatically collect log data, including your IP
                address, browser type, device identifiers, date/time stamps, and the pages you
                visit.
              </li>
              <li>
                <strong>Cookies & Similar Technologies:</strong> We use cookies and similar tracking
                tools to enhance user experience, analyze traffic, and remember preferences.
              </li>
            </ul>
          </section>

          {/* Continue with remaining sections... */}

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">13. Contact Us</h2>
            <p>
              If you have any questions or concerns about this Privacy Policy or our data practices,
              please contact us at:
            </p>
            <div className="mt-4">
              <p className="font-semibold">News On Africa</p>
              <p>Email: info@newsonafrica.com</p>
            </div>
          </section>
        </div>
      </article>
    </div>
  );
}
