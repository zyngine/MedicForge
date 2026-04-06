"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
  Button,
  Label,
  Alert,
  Spinner,
} from "@/components/ui";
import { Bell, Mail, Save } from "lucide-react";
import { useTenant } from "@/lib/hooks/use-tenant";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface NotificationSettings {
  email_new_enrollment: boolean;
  email_assignment_submitted: boolean;
  email_grade_posted: boolean;
  email_course_announcement: boolean;
  email_message_received: boolean;
  email_weekly_digest: boolean;
  admin_new_user: boolean;
  admin_subscription_alert: boolean;
}

const defaultSettings: NotificationSettings = {
  email_new_enrollment: true,
  email_assignment_submitted: true,
  email_grade_posted: true,
  email_course_announcement: true,
  email_message_received: true,
  email_weekly_digest: false,
  admin_new_user: true,
  admin_subscription_alert: true,
};

export default function NotificationSettingsPage() {
  const { tenant, isLoading: tenantLoading, refetch } = useTenant();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);

  useEffect(() => {
    if (tenant?.settings) {
      const tenantSettings = tenant.settings as Record<string, any>;
      const notifications = (tenantSettings.notifications || {}) as Partial<NotificationSettings>;
      setSettings({ ...defaultSettings, ...notifications });
    }
  }, [tenant]);

  const handleToggle = (key: keyof NotificationSettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!tenant) return;

    setIsSaving(true);
    setError(null);

    try {
      const supabase = createClient();

      const updatedSettings = {
        ...(tenant.settings || {}),
        notifications: settings,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any)
        .from("tenants")
        .update({
          settings: updatedSettings,
          updated_at: new Date().toISOString(),
        })
        .eq("id", tenant.id);

      if (updateError) throw updateError;

      toast.success("Notification settings saved");
      refetch();
    } catch (err) {
      console.error("Save error:", err);
      setError("Failed to save notification settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (tenantLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  const ToggleSwitch = ({
    checked,
    onChange,
  }: {
    checked: boolean;
    onChange: () => void;
  }) => (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="sr-only peer"
      />
      <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
    </label>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Notifications</h1>
        <p className="text-muted-foreground">
          Configure email notifications and alerts for your organization
        </p>
      </div>

      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Notifications
          </CardTitle>
          <CardDescription>
            Choose which emails are sent to users in your organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <Label className="font-medium">New Enrollment</Label>
              <p className="text-sm text-muted-foreground">
                Notify instructors when students enroll in their courses
              </p>
            </div>
            <ToggleSwitch
              checked={settings.email_new_enrollment}
              onChange={() => handleToggle("email_new_enrollment")}
            />
          </div>

          <div className="flex items-center justify-between py-2 border-t">
            <div>
              <Label className="font-medium">Assignment Submitted</Label>
              <p className="text-sm text-muted-foreground">
                Notify instructors when students submit assignments
              </p>
            </div>
            <ToggleSwitch
              checked={settings.email_assignment_submitted}
              onChange={() => handleToggle("email_assignment_submitted")}
            />
          </div>

          <div className="flex items-center justify-between py-2 border-t">
            <div>
              <Label className="font-medium">Grade Posted</Label>
              <p className="text-sm text-muted-foreground">
                Notify students when grades are posted
              </p>
            </div>
            <ToggleSwitch
              checked={settings.email_grade_posted}
              onChange={() => handleToggle("email_grade_posted")}
            />
          </div>

          <div className="flex items-center justify-between py-2 border-t">
            <div>
              <Label className="font-medium">Course Announcements</Label>
              <p className="text-sm text-muted-foreground">
                Notify students of new course announcements
              </p>
            </div>
            <ToggleSwitch
              checked={settings.email_course_announcement}
              onChange={() => handleToggle("email_course_announcement")}
            />
          </div>

          <div className="flex items-center justify-between py-2 border-t">
            <div>
              <Label className="font-medium">Messages Received</Label>
              <p className="text-sm text-muted-foreground">
                Notify users when they receive new messages
              </p>
            </div>
            <ToggleSwitch
              checked={settings.email_message_received}
              onChange={() => handleToggle("email_message_received")}
            />
          </div>

          <div className="flex items-center justify-between py-2 border-t">
            <div>
              <Label className="font-medium">Weekly Digest</Label>
              <p className="text-sm text-muted-foreground">
                Send users a weekly summary of activity
              </p>
            </div>
            <ToggleSwitch
              checked={settings.email_weekly_digest}
              onChange={() => handleToggle("email_weekly_digest")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Admin Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Admin Alerts
          </CardTitle>
          <CardDescription>
            Notifications sent to organization administrators
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <Label className="font-medium">New User Registration</Label>
              <p className="text-sm text-muted-foreground">
                Alert when new users register for your organization
              </p>
            </div>
            <ToggleSwitch
              checked={settings.admin_new_user}
              onChange={() => handleToggle("admin_new_user")}
            />
          </div>

          <div className="flex items-center justify-between py-2 border-t">
            <div>
              <Label className="font-medium">Subscription Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Alert for subscription renewals and payment issues
              </p>
            </div>
            <ToggleSwitch
              checked={settings.admin_subscription_alert}
              onChange={() => handleToggle("admin_subscription_alert")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Spinner size="sm" className="mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
