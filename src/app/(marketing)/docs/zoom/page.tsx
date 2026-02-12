import { MarketingLayout } from "@/components/layouts";
import { Badge, Card, CardContent } from "@/components/ui";
import { Video, Link, Settings, Trash2, Shield } from "lucide-react";

export default function ZoomIntegrationPage() {
  return (
    <MarketingLayout>
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <Badge variant="secondary" className="mb-4">
              Integration Guide
            </Badge>
            <h1 className="text-4xl font-bold mb-6">Zoom Integration</h1>
            <p className="text-muted-foreground mb-8">
              Connect your Zoom account to MedicForge to create and manage video sessions for your EMS training courses.
            </p>

            <div className="prose prose-gray max-w-none">
              <h2 className="text-2xl font-semibold mt-8 mb-4 flex items-center gap-2">
                <Link className="h-6 w-6" />
                Connecting Your Zoom Account
              </h2>
              <ol className="list-decimal pl-6 text-muted-foreground mb-6 space-y-3">
                <li>Log in to your MedicForge instructor account</li>
                <li>Navigate to <strong>Video Sessions</strong> from the sidebar</li>
                <li>Click <strong>Connect Zoom Account</strong></li>
                <li>You will be redirected to Zoom to authorize MedicForge</li>
                <li>Review the permissions and click <strong>Allow</strong></li>
                <li>You will be redirected back to MedicForge with your account connected</li>
              </ol>

              <Card className="mb-8">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">
                    <strong>Note:</strong> MedicForge requests permission to create and manage meetings on your behalf.
                    We only access meeting data necessary to schedule and display your video sessions.
                  </p>
                </CardContent>
              </Card>

              <h2 className="text-2xl font-semibold mt-8 mb-4 flex items-center gap-2">
                <Video className="h-6 w-6" />
                Using Zoom with MedicForge
              </h2>
              <p className="text-muted-foreground mb-4">
                Once connected, you can:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground mb-6 space-y-2">
                <li>Create Zoom meetings directly from the Video Sessions page</li>
                <li>Schedule live class sessions with automatic Zoom links</li>
                <li>Share meeting links with enrolled students</li>
                <li>View upcoming and past video sessions</li>
              </ul>

              <h3 className="text-xl font-semibold mt-6 mb-3">Creating a Video Session</h3>
              <ol className="list-decimal pl-6 text-muted-foreground mb-6 space-y-2">
                <li>Go to <strong>Video Sessions</strong></li>
                <li>Click <strong>New Session</strong></li>
                <li>Enter the session title, date, time, and duration</li>
                <li>Select the course this session belongs to</li>
                <li>Click <strong>Create Session</strong></li>
                <li>A Zoom meeting will be automatically created and linked</li>
              </ol>

              <h2 className="text-2xl font-semibold mt-8 mb-4 flex items-center gap-2">
                <Trash2 className="h-6 w-6" />
                Disconnecting Your Zoom Account
              </h2>
              <p className="text-muted-foreground mb-4">
                To disconnect your Zoom account from MedicForge:
              </p>
              <ol className="list-decimal pl-6 text-muted-foreground mb-6 space-y-2">
                <li>Go to <strong>Video Sessions</strong></li>
                <li>Click on <strong>Settings</strong> or the gear icon</li>
                <li>Click <strong>Disconnect Zoom Account</strong></li>
                <li>Confirm the disconnection</li>
              </ol>
              <p className="text-muted-foreground mb-4">
                You can also revoke access directly from your Zoom account:
              </p>
              <ol className="list-decimal pl-6 text-muted-foreground mb-6 space-y-2">
                <li>Log in to <a href="https://zoom.us" className="text-primary hover:underline">zoom.us</a></li>
                <li>Go to <strong>Settings</strong> → <strong>Apps</strong></li>
                <li>Find <strong>MedicForge</strong> and click <strong>Remove</strong></li>
              </ol>

              <h2 className="text-2xl font-semibold mt-8 mb-4 flex items-center gap-2">
                <Shield className="h-6 w-6" />
                Data & Privacy
              </h2>
              <p className="text-muted-foreground mb-4">
                MedicForge takes your privacy seriously:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground mb-6 space-y-2">
                <li>We only store the OAuth tokens necessary to create meetings</li>
                <li>Meeting data is only accessed when you create or view sessions</li>
                <li>We do not access your Zoom recordings or other account data</li>
                <li>All data is transmitted over encrypted connections (TLS 1.2+)</li>
                <li>You can disconnect at any time and we will delete your Zoom tokens</li>
              </ul>
              <p className="text-muted-foreground">
                For more information, see our <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4 flex items-center gap-2">
                <Settings className="h-6 w-6" />
                Troubleshooting
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <div>
                  <p className="font-medium text-foreground">Connection failed?</p>
                  <p>Make sure you are logged into Zoom and have permission to authorize apps. Try disconnecting and reconnecting.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Meeting not creating?</p>
                  <p>Check that your Zoom account is still connected in Video Sessions. Your token may have expired - try reconnecting.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Need help?</p>
                  <p>Contact our support team at <a href="mailto:admin@medicforge.com" className="text-primary hover:underline">admin@medicforge.com</a></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
