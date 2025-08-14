import { format } from 'date-fns';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms and Conditions - News On Africa',
  description: 'Read the terms and conditions for using News On Africa services.',
};

export default function TermsAndConditions() {
  const currentDate = format(new Date(), 'MMMM d, yyyy');

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">NEWS ON AFRICA TERMS AND CONDITIONS</h1>
      <p className="mb-4">Effective Date: {currentDate}</p>

      <div className="prose prose-sm sm:prose lg:prose-lg mx-auto">
        <p>
          Welcome to News On Africa (referred to in these Terms and Conditions as &quot;we,&quot; &quot;us,&quot; or
          &quot;our&quot;). These Terms and Conditions (&quot;Terms&quot;) govern your use of the News On Africa
          website, progressive web app, and any associated services or platforms (collectively, the
          &quot;Platform&quot;). By accessing, browsing, or using our Platform, you acknowledge that you have
          read, understood, and agree to be bound by these Terms.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-4">1. ACCEPTANCE OF TERMS</h2>
        <h3 className="text-xl font-semibold mt-4 mb-2">1.1 Binding Agreement</h3>
        <p>
          By accessing or using any part of the Platform, you agree to be bound by these Terms, as
          well as any other guidelines, policies, or additional terms posted on the Platform or
          otherwise made available to you by us. If you do not agree with any portion of these
          Terms, you must immediately cease using the Platform.
        </p>

        <h3 className="text-xl font-semibold mt-4 mb-2">1.2 Eligibility</h3>
        <p>
          Use of our Platform is intended for individuals who are of legal age in their
          jurisdiction. By accessing or using the Platform, you represent that you are of legal age
          and are otherwise capable of forming legally binding contracts.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-4">2. CHANGES TO TERMS</h2>
        <h3 className="text-xl font-semibold mt-4 mb-2">2.1 Right to Modify</h3>
        <p>
          We reserve the right, in our sole discretion, to modify, update, or replace any part of
          these Terms at any time. Any changes will be effective immediately upon posting on the
          Platform.
        </p>

        <h3 className="text-xl font-semibold mt-4 mb-2">2.2 Notification of Changes</h3>
        <p>
          We will indicate at the top of these Terms the date of the latest revision. It is your
          responsibility to regularly review the Terms. Your continued use of the Platform after any
          such changes constitutes your acceptance of the modified Terms.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-4">3. INTELLECTUAL PROPERTY</h2>
        <h3 className="text-xl font-semibold mt-4 mb-2">3.1 Ownership</h3>
        <p>
          All content published on the Platform, including but not limited to text, graphics, logos,
          images, audio clips, video clips, articles, and software, is the property of News On
          Africa or its content suppliers and is protected by applicable intellectual property laws.
        </p>

        <h3 className="text-xl font-semibold mt-4 mb-2">3.2 Limited License</h3>
        <p>
          Subject to these Terms, we grant you a limited, non-exclusive, non-transferable, and
          revocable license to access and use the Platform for personal, non-commercial purposes.
          Any other use of the content requires our express written permission.
        </p>

        <h3 className="text-xl font-semibold mt-4 mb-2">3.3 Trademark Notice</h3>
        <p>
          &quot;News On Africa,&quot; and all related names, logos, product and service names, designs, and
          slogans are trademarks of News On Africa or its affiliates or licensors. You must not use
          such marks without the prior written permission of News On Africa.
        </p>

        {/* Continue with the rest of the sections... */}

        <h2 className="text-2xl font-semibold mt-6 mb-4">12. CONTACT US</h2>
        <p>If you have any questions or concerns about these Terms, please contact us at:</p>
        <p>Email: info@newsonafrica.com</p>

        <p className="mt-6">
          Thank you for reading and agreeing to these Terms. By continuing to use the Platform, you
          acknowledge that you have understood and accepted all terms, disclaimers, and policies
          herein.
        </p>

        <p className="mt-4">Last updated on: {currentDate}</p>
      </div>
    </div>
  );
}
