'use client';

import { Check, HelpCircle, Lock, Shield, CreditCard, Calendar, Award } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

import { PaystackButton } from '@/components/PaystackButton';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SUBSCRIPTION_PLANS } from '@/config/paystack';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, calculateMonthlyPrice, formatNextBillingDate } from '@/lib/paystack-utils';


export function SubscribeContent() {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('biannually'); // Default to the popular plan
  const [step, setStep] = useState(1);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();

  // Pre-fill email if user is logged in
  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  const selectedPlan = SUBSCRIPTION_PLANS.find((plan) => plan.id === selectedPlanId);

  const handleSuccess = (reference: string, responseData: any) => {
    console.log('Subscription successful, storing data and redirecting...', {
      reference,
      responseData,
    });

    try {
      // Prevent multiple redirects
      if (isRedirecting) return;
      setIsRedirecting(true);

      // Store subscription info in localStorage
      localStorage.setItem('subscription_active', 'true');
      localStorage.setItem('subscription_reference', reference);
      localStorage.setItem('subscription_plan', selectedPlanId);
      localStorage.setItem('subscription_date', new Date().toISOString());

      // Show success message
      toast({
        title: 'Subscription Activated',
        description:
          'Your subscription has been successfully activated. Redirecting to welcome page...',
      });

      // Redirect to welcome page after a short delay
      setTimeout(() => {
        router.push('/welcome');
      }, 1500);
    } catch (error) {
      console.error('Error in handleSuccess:', error);
      setIsRedirecting(false);
      toast({
        title: 'Error',
        description: 'There was an error processing your subscription. Please contact support.',
        variant: 'destructive',
      });
    }
  };

  const handleError = (error: string) => {
    console.error('Payment error:', error);
    toast({
      title: 'Payment Failed',
      description:
        'There was an error processing your payment. Please try again or contact support.',
      variant: 'destructive',
    });
  };

  const isFormValid = email && email.includes('@') && firstName && lastName && selectedPlan;

  const goToNextStep = () => {
    if (step === 1 && !selectedPlan) {
      toast({
        title: 'Please select a plan',
        description: 'You need to select a subscription plan to continue.',
        variant: 'destructive',
      });
      return;
    }

    if (step === 2 && !isFormValid) {
      toast({
        title: 'Please complete all fields',
        description: 'All fields are required to proceed with your subscription.',
        variant: 'destructive',
      });
      return;
    }

    setStep(step + 1);
  };

  const goToPreviousStep = () => {
    setStep(step - 1);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Subscribe to News On Africa</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Get unlimited access to trusted journalism from across the continent
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            <div className={`flex items-center ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div
                className={`rounded-full h-8 w-8 flex items-center justify-center border-2 ${step >= 1 ? 'border-blue-600 bg-blue-50' : 'border-gray-300'}`}
              >
                1
              </div>
              <span className="ml-2 text-sm font-medium hidden sm:inline">Select Plan</span>
            </div>
            <div
              className={`w-12 sm:w-24 h-1 mx-2 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}
            ></div>
            <div className={`flex items-center ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div
                className={`rounded-full h-8 w-8 flex items-center justify-center border-2 ${step >= 2 ? 'border-blue-600 bg-blue-50' : 'border-gray-300'}`}
              >
                2
              </div>
              <span className="ml-2 text-sm font-medium hidden sm:inline">Your Details</span>
            </div>
            <div
              className={`w-12 sm:w-24 h-1 mx-2 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`}
            ></div>
            <div className={`flex items-center ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div
                className={`rounded-full h-8 w-8 flex items-center justify-center border-2 ${step >= 3 ? 'border-blue-600 bg-blue-50' : 'border-gray-300'}`}
              >
                3
              </div>
              <span className="ml-2 text-sm font-medium hidden sm:inline">Payment</span>
            </div>
          </div>
        </div>

        {/* Step 1: Subscription Plans */}
        {step === 1 && (
          <div className="space-y-6">
            <Tabs defaultValue="monthly" onValueChange={setSelectedPlanId} value={selectedPlanId}>
              <TabsList className="grid w-full grid-cols-3 mb-6">
                {SUBSCRIPTION_PLANS.map((plan) => (
                  <TabsTrigger key={plan.id} value={plan.id} className="relative">
                    {plan.isPopular && (
                      <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        POPULAR
                      </span>
                    )}
                    {plan.name}
                  </TabsTrigger>
                ))}
              </TabsList>

              {SUBSCRIPTION_PLANS.map((plan) => (
                <TabsContent key={plan.id} value={plan.id} className="space-y-4">
                  <Card className={`${plan.isPopular ? 'border-blue-600 shadow-md' : ''}`}>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle className="text-2xl">{plan.name}</CardTitle>
                          <CardDescription>{plan.description}</CardDescription>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold">
                            {formatCurrency(plan.amount, plan.currency)}
                          </div>
                          <div className="text-sm text-gray-500">per {plan.interval}</div>
                          {plan.savePercentage && (
                            <div className="text-sm font-medium text-green-600">
                              Save {plan.savePercentage}%
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h3 className="font-medium flex items-center mb-2">
                              <Check className="h-5 w-5 text-green-500 mr-2" />
                              What&apos;s included:
                          </h3>
                          <ul className="space-y-2">
                            {plan.features?.map((feature, index) => (
                              <li key={index} className="flex items-start text-sm">
                                <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="space-y-4">
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="flex items-center mb-2">
                              <Calendar className="h-5 w-5 text-blue-600 mr-2" />
                              <h3 className="font-medium">Billing Details</h3>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              Next billing date: {formatNextBillingDate(plan.interval)}
                            </p>
                            {plan.interval !== 'monthly' && (
                              <p className="text-sm text-gray-600">
                                Monthly equivalent:{' '}
                                {formatCurrency(
                                  calculateMonthlyPrice(plan.amount, plan.interval),
                                  plan.currency,
                                )}
                                /month
                              </p>
                            )}
                          </div>
                          {plan.trial && (
                            <div className="bg-blue-50 p-4 rounded-lg">
                              <div className="flex items-center mb-2">
                                <Award className="h-5 w-5 text-blue-600 mr-2" />
                                <h3 className="font-medium">Free Trial</h3>
                              </div>
                              <p className="text-sm text-gray-600">
                                Start with {plan.trial} before your first payment
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-center">
                      <button
                        onClick={goToNextStep}
                        className="w-full py-3 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Select {plan.name} Plan
                      </button>
                    </CardFooter>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-bold mb-4">Frequently Asked Questions</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold">How does the free trial work?</h3>
                  <p className="text-sm text-gray-600">
                      Your free trial begins immediately. You won&apos;t be charged until the trial period
                      ends, and you can cancel anytime.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold">Can I cancel my subscription?</h3>
                  <p className="text-sm text-gray-600">
                    Yes, you can cancel your subscription at any time from your account settings.
                    Your access will continue until the end of your billing period.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold">What payment methods are accepted?</h3>
                  <p className="text-sm text-gray-600">
                    We accept all major credit and debit cards, including Visa, Mastercard, and
                    American Express.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: User Information Form */}
        {step === 2 && (
          <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
            <h2 className="text-xl font-bold mb-4">Your Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1"
                  required
                  disabled={!!user?.email}
                />
                  <p className="text-xs text-gray-500 mt-1">
                    We&apos;ll send your receipt and subscription details to this email
                  </p>
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              <button
                onClick={goToPreviousStep}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={goToNextStep}
                disabled={!isFormValid}
                className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 ${
                  !isFormValid ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                Continue to Payment
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Payment */}
        {step === 3 && selectedPlan && (
          <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
            <h2 className="text-xl font-bold mb-4">Complete Your Subscription</h2>

            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">Order Summary</h3>
              <div className="flex justify-between mb-2">
                <span>{selectedPlan.name} Subscription</span>
                <span>{formatCurrency(selectedPlan.amount, selectedPlan.currency)}</span>
              </div>
              {selectedPlan.trial && (
                <div className="flex justify-between text-green-600">
                  <span>Free Trial</span>
                  <span>{selectedPlan.trial}</span>
                </div>
              )}
              <div className="border-t border-gray-200 my-2 pt-2 flex justify-between font-bold">
                <span>Total</span>
                <span>{formatCurrency(selectedPlan.amount, selectedPlan.currency)}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Next billing date: {formatNextBillingDate(selectedPlan.interval)}
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-center">
                <Shield className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-sm">Your payment is secure and encrypted</span>
              </div>
              <div className="flex items-center">
                <CreditCard className="h-5 w-5 text-blue-600 mr-2" />
                <span className="text-sm">We accept all major credit cards</span>
              </div>
            </div>

            {/* Payment Button */}
            <div className="mb-4">
              <PaystackButton
                email={email}
                plan={selectedPlan}
                onSuccess={handleSuccess}
                onError={handleError}
                firstName={firstName}
                lastName={lastName}
                metadata={{
                  full_name: `${firstName} ${lastName}`,
                }}
                label={isRedirecting ? 'Redirecting...' : 'Complete Subscription'}
                disabled={isRedirecting}
              />
            </div>

            {/* Security Notice */}
            <div className="flex items-center justify-center mt-4 text-xs text-gray-500">
              <Lock className="h-3 w-3 mr-1" />
              <span>Secure payment powered by</span>
              <Image
                src="/paystack-logo.svg"
                alt="Paystack"
                width={60}
                height={20}
                className="ml-1"
              />
            </div>

            <div className="mt-6 flex justify-between">
              <button
                onClick={goToPreviousStep}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={isRedirecting}
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="text-center">
          <div className="inline-flex items-center text-sm text-gray-600">
            <HelpCircle className="h-4 w-4 mr-2" />
            Need help?{' '}
            <Link href="/contact" className="text-blue-600 hover:underline ml-1">
              Contact us
            </Link>
          </div>
        </div>

        {/* Terms and Privacy */}
        <div className="text-center mt-8 text-xs text-gray-500">
          <p>
            By subscribing, you agree to our{' '}
            <Link href="/terms" className="text-blue-600 hover:underline">
              Terms
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-blue-600 hover:underline">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
