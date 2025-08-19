import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/landing/header';
import { ArrowRight, BarChart, CheckCircle, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                    Simplified Payroll for Your Small Business
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    WorkRoll is the smart, intuitive, and affordable solution to manage your team's payroll, PTO, and more. Stop wrestling with spreadsheets and start focusing on your business.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button asChild size="lg">
                     <Link href="/signup">
                        Get Started for Free
                        <ArrowRight className="ml-2 h-4 w-4" />
                     </Link>
                  </Button>
                </div>
              </div>
              <Image
                src="https://placehold.co/600x400.png"
                alt="Payroll Dashboard Hero Image"
                width={600}
                height={400}
                className="mx-auto aspect-video overflow-hidden rounded-xl object-cover sm:w-full lg:order-last"
                data-ai-hint="payroll dashboard"
              />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full bg-muted py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-secondary px-3 py-1 text-sm">
                  Key Features
                </div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                  Everything You Need, Nothing You Don't
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Our platform is designed with the small business owner in mind. Powerful features that are easy to use.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-3 lg:gap-12">
              <Card>
                <CardHeader className="flex flex-col items-center text-center">
                    <Users className="mb-4 h-12 w-12 text-primary" />
                    <CardTitle>Employee Management</CardTitle>
                    <CardDescription>Keep all your employee records in one secure, organized place. Easily add new hires and manage existing staff.</CardDescription>
                </CardHeader>
              </Card>
               <Card>
                <CardHeader className="flex flex-col items-center text-center">
                    <CheckCircle className="mb-4 h-12 w-12 text-primary" />
                    <CardTitle>Effortless Payroll Runs</CardTitle>
                    <CardDescription>Calculate payroll in minutes. Enter hours, review, and approve. We handle the complex calculations for you.</CardDescription>
                </CardHeader>
              </Card>
               <Card>
                <CardHeader className="flex flex-col items-center text-center">
                    <BarChart className="mb-4 h-12 w-12 text-primary" />
                    <CardTitle>Clear Reporting</CardTitle>
                    <CardDescription>Generate detailed payroll reports and individual payslips. Gain insights into your labor costs with a single click.</CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>
      </main>
      
      {/* Footer */}
      <footer className="flex w-full shrink-0 flex-col items-center gap-2 border-t px-4 py-6 sm:flex-row md:px-6">
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} WorkRoll. All rights reserved.
        </p>
        <nav className="flex gap-4 sm:ml-auto sm:gap-6">
          <Link href="#" className="text-xs hover:underline underline-offset-4">
            Terms of Service
          </Link>
          <Link href="#" className="text-xs hover:underline underline-offset-4">
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  );
}
