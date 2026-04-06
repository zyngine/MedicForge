import Link from "next/link";
import { BookOpen, Award, Shield, Clock, Users, CheckCircle, Building2 } from "lucide-react";

export default async function CELandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Nav */}
      <nav className="border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-red-700" />
          <span className="font-bold text-lg">MedicForge CE</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/ce/catalog" className="text-sm text-gray-600 hover:text-gray-900">
            Course Catalog
          </Link>
          <Link href="/ce/login" className="text-sm text-gray-600 hover:text-gray-900">
            Sign In
          </Link>
          <Link
            href="/ce/register"
            className="bg-red-700 text-white text-sm px-4 py-2 rounded-md hover:bg-red-800"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-20 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-red-50 text-red-700 text-sm px-3 py-1 rounded-full mb-6">
          <Shield className="h-4 w-4" />
          Built to CAPCE Standards — CAPCE Accreditation Coming 2027
        </div>
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Continuing Education<br />Built for EMS Providers
        </h1>
        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
          Quality CE content accepted in Pennsylvania and states that recognize approved providers.
          Complete your CEHs on your schedule, earn verified certificates, and stay ready for NREMT recertification.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/ce/register"
            className="bg-red-700 text-white px-8 py-3 rounded-md text-lg font-medium hover:bg-red-800"
          >
            Start Free
          </Link>
          <Link
            href="/ce/catalog"
            className="border border-gray-300 text-gray-700 px-8 py-3 rounded-md text-lg font-medium hover:bg-gray-50"
          >
            Browse Courses
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            Everything you need for EMS recertification
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg border">
              <Award className="h-8 w-8 text-red-700 mb-4" />
              <h3 className="font-semibold text-lg mb-2 text-gray-900">Verified Certificates</h3>
              <p className="text-gray-600 text-sm">
                Every completion generates a verifiable certificate with a unique QR code.
                Accepted by state EMS offices and NREMT.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg border">
              <Clock className="h-8 w-8 text-red-700 mb-4" />
              <h3 className="font-semibold text-lg mb-2 text-gray-900">Learn at Your Pace</h3>
              <p className="text-gray-600 text-sm">
                Self-paced online courses available 24/7. Start, pause, and resume whenever
                your shift schedule allows.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg border">
              <Shield className="h-8 w-8 text-red-700 mb-4" />
              <h3 className="font-semibold text-lg mb-2 text-gray-900">CAPCE-Ready Content</h3>
              <p className="text-gray-600 text-sm">
                All courses built to CAPCE standards: evidence-based content, measurable
                learning objectives, and committee-reviewed curriculum.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg border">
              <Users className="h-8 w-8 text-red-700 mb-4" />
              <h3 className="font-semibold text-lg mb-2 text-gray-900">Agency Solutions</h3>
              <p className="text-gray-600 text-sm">
                Manage your entire department&apos;s CE from one dashboard. Assign training,
                track compliance, and export reports.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg border">
              <BookOpen className="h-8 w-8 text-red-700 mb-4" />
              <h3 className="font-semibold text-lg mb-2 text-gray-900">Custom Training</h3>
              <p className="text-gray-600 text-sm">
                Upload your agency&apos;s own protocols and training materials. Host custom
                courses alongside our catalog content.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg border">
              <CheckCircle className="h-8 w-8 text-red-700 mb-4" />
              <h3 className="font-semibold text-lg mb-2 text-gray-900">NREMT Ready</h3>
              <p className="text-gray-600 text-sm">
                Courses mapped to NREMT topic categories. When CAPCE accreditation is
                approved, completions will auto-report to NREMT.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing — Individual */}
      <section className="px-6 py-16 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-4 text-gray-900">Simple, transparent pricing</h2>
        <p className="text-center text-gray-600 mb-12">
          No per-seat fees. No hidden costs. Individual providers or entire departments.
        </p>

        <h3 className="text-lg font-semibold text-gray-900 mb-6">For Individual Providers</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="border rounded-lg p-6">
            <h4 className="font-semibold text-lg mb-1 text-gray-900">Free Courses</h4>
            <div className="text-3xl font-bold mb-4">$0</div>
            <p className="text-sm text-gray-600 mb-4">Try before you commit</p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /> Select free courses</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /> Verified certificates</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /> CE transcript</li>
            </ul>
          </div>
          <div className="border rounded-lg p-6">
            <h4 className="font-semibold text-lg mb-1 text-gray-900">Per Course</h4>
            <div className="text-3xl font-bold mb-4">$10–25</div>
            <p className="text-sm text-gray-600 mb-4">Pay as you go</p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /> Single course access</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /> Verified certificate</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /> CE transcript</li>
            </ul>
          </div>
          <div className="border-2 border-red-700 rounded-lg p-6 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-700 text-white text-xs px-3 py-1 rounded-full">
              Best Value
            </div>
            <h4 className="font-semibold text-lg mb-1 text-gray-900">Annual Unlimited</h4>
            <div className="text-3xl font-bold mb-1">$69<span className="text-base font-normal">/yr</span></div>
            <p className="text-sm text-green-600 mb-4">Every course included</p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /> Unlimited course access</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /> All certificates included</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /> Full CE transcript</li>
            </ul>
          </div>
        </div>

        {/* Pricing — Agency */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2">For Agencies &amp; Departments</h3>
        <p className="text-sm text-gray-600 mb-6">
          Flat annual pricing — no per-seat fees, no surprise invoices. Every employee gets full access.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="border rounded-lg p-6">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="h-5 w-5 text-red-700" />
              <h4 className="font-semibold text-gray-900">Starter</h4>
            </div>
            <div className="text-3xl font-bold mb-1">$1,000<span className="text-base font-normal">/yr</span></div>
            <p className="text-sm text-gray-500 mb-4">Up to 25 employees</p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /> Unlimited CE for all staff</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /> Compliance dashboard</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /> Training assignments</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /> NREMT reporting</li>
            </ul>
          </div>
          <div className="border-2 border-red-700 rounded-lg p-6 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-700 text-white text-xs px-3 py-1 rounded-full">
              Most Popular
            </div>
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="h-5 w-5 text-red-700" />
              <h4 className="font-semibold text-gray-900">Team</h4>
            </div>
            <div className="text-3xl font-bold mb-1">$2,000<span className="text-base font-normal">/yr</span></div>
            <p className="text-sm text-gray-500 mb-4">Up to 75 employees</p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /> Everything in Starter</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /> Custom course uploads</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /> Advanced reporting</li>
            </ul>
          </div>
          <div className="border rounded-lg p-6">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="h-5 w-5 text-red-700" />
              <h4 className="font-semibold text-gray-900">Department</h4>
            </div>
            <div className="text-3xl font-bold mb-1">$4,000<span className="text-base font-normal">/yr</span></div>
            <p className="text-sm text-gray-500 mb-4">Up to 200 employees</p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /> Everything in Team</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /> Dedicated onboarding</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /> Priority support</li>
            </ul>
          </div>
          <div className="border rounded-lg p-6">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="h-5 w-5 text-red-700" />
              <h4 className="font-semibold text-gray-900">Enterprise</h4>
            </div>
            <div className="text-3xl font-bold mb-1">$7,000<span className="text-base font-normal">/yr</span></div>
            <p className="text-sm text-gray-500 mb-4">Unlimited employees</p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /> Everything in Department</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /> Custom integrations</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /> Account manager</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Accreditation Banner */}
      <section className="bg-gray-900 text-white px-6 py-10 text-center">
        <p className="text-sm text-gray-400 mb-2">Accreditation Status</p>
        <p className="font-medium">
          MedicForge Continuing Education — Quality CE content built to CAPCE standards.
        </p>
        <p className="text-gray-400 text-sm mt-1">
          Accepted in Pennsylvania and states that recognize approved providers. CAPCE accreditation: Coming 2027.
        </p>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t text-center text-sm text-gray-500">
        <div className="flex items-center justify-center gap-6 mb-4">
          <Link href="/ce/terms" className="hover:text-gray-700">Terms of Service</Link>
          <Link href="/ce/privacy" className="hover:text-gray-700">Privacy Policy</Link>
          <Link href="/ce/help" className="hover:text-gray-700">Help</Link>
          <Link href="/ce/contact" className="hover:text-gray-700">Contact</Link>
        </div>
        <p>© {new Date().getFullYear()} Summers Digital LLC. All rights reserved.</p>
      </footer>
    </div>
  );
}
