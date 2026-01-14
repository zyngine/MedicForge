"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Label,
  Textarea,
  Switch,
  Avatar,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Alert,
  Badge,
} from "@/components/ui";
import {
  Settings,
  User,
  Bell,
  Shield,
  Palette,
  Save,
  Camera,
  Mail,
  Phone,
  Building,
} from "lucide-react";
import { useUser } from "@/lib/hooks/use-user";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function InstructorSettingsPage() {
  const { profile, refreshProfile } = useUser();
  const [isLoading, setIsLoading] = React.useState(false);

  // Profile form state
  const [profileForm, setProfileForm] = React.useState({
    full_name: profile?.full_name || "",
    email: profile?.email || "",
    phone: profile?.phone || "",
    bio: "",
    office_location: "",
    office_hours: "",
  });

  // Notification preferences
  const [notifications, setNotifications] = React.useState({
    email_submissions: true,
    email_messages: true,
    email_announcements: false,
    push_submissions: true,
    push_messages: true,
    push_grades: false,
  });

  // Update form when profile loads
  React.useEffect(() => {
    if (profile) {
      setProfileForm({
        full_name: profile.full_name || "",
        email: profile.email || "",
        phone: profile.phone || "",
        bio: "",
        office_location: "",
        office_hours: "",
      });
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    if (!profile?.id) return;
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("users")
        .update({
          full_name: profileForm.full_name,
          phone: profileForm.phone,
        })
        .eq("id", profile.id);

      if (error) throw error;

      await refreshProfile();
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNotifications = () => {
    toast.success("Notification preferences saved");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="preferences">
            <Palette className="h-4 w-4 mr-2" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="mt-6">
          <div className="grid gap-6">
            {/* Avatar Section */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Photo</CardTitle>
                <CardDescription>
                  This will be displayed on your profile and in course materials
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <Avatar
                    src={profile?.avatar_url}
                    fallback={profile?.full_name || "I"}
                    size="xl"
                  />
                  <div className="space-y-2">
                    <Button variant="outline">
                      <Camera className="h-4 w-4 mr-2" />
                      Change Photo
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      JPG, PNG or GIF. Max 2MB.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Your personal information visible to students
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={profileForm.full_name}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, full_name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileForm.email}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      Contact admin to change email
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={profileForm.phone}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, phone: e.target.value })
                      }
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="office">Office Location</Label>
                    <Input
                      id="office"
                      value={profileForm.office_location}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, office_location: e.target.value })
                      }
                      placeholder="Building A, Room 101"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="office_hours">Office Hours</Label>
                  <Input
                    id="office_hours"
                    value={profileForm.office_hours}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, office_hours: e.target.value })
                    }
                    placeholder="Mon/Wed 2-4 PM, or by appointment"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={profileForm.bio}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, bio: e.target.value })
                    }
                    placeholder="Tell students about your background and expertise..."
                    rows={4}
                  />
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSaveProfile} disabled={isLoading}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose how you want to be notified about activity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Email Notifications */}
              <div>
                <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Notifications
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">New Submissions</p>
                      <p className="text-sm text-muted-foreground">
                        Get notified when students submit assignments
                      </p>
                    </div>
                    <Switch
                      checked={notifications.email_submissions}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, email_submissions: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Messages</p>
                      <p className="text-sm text-muted-foreground">
                        Get notified when you receive a message
                      </p>
                    </div>
                    <Switch
                      checked={notifications.email_messages}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, email_messages: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Announcements</p>
                      <p className="text-sm text-muted-foreground">
                        Get notified about system announcements
                      </p>
                    </div>
                    <Switch
                      checked={notifications.email_announcements}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, email_announcements: checked })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Push Notifications */}
              <div>
                <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Push Notifications
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">New Submissions</p>
                      <p className="text-sm text-muted-foreground">
                        Browser notifications for new submissions
                      </p>
                    </div>
                    <Switch
                      checked={notifications.push_submissions}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, push_submissions: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Messages</p>
                      <p className="text-sm text-muted-foreground">
                        Browser notifications for messages
                      </p>
                    </div>
                    <Switch
                      checked={notifications.push_messages}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, push_messages: checked })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveNotifications}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Display Preferences</CardTitle>
              <CardDescription>
                Customize your viewing experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Compact View</p>
                    <p className="text-sm text-muted-foreground">
                      Show more content with less spacing
                    </p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Show Student Photos</p>
                    <p className="text-sm text-muted-foreground">
                      Display student avatars in lists
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Auto-expand Feedback</p>
                    <p className="text-sm text-muted-foreground">
                      Automatically show feedback panel when grading
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="mt-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Update your password regularly to keep your account secure
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current_password">Current Password</Label>
                  <Input id="current_password" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new_password">New Password</Label>
                  <Input id="new_password" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm_password">Confirm New Password</Label>
                  <Input id="confirm_password" type="password" />
                </div>
                <div className="flex justify-end">
                  <Button>Update Password</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Two-Factor Authentication</CardTitle>
                <CardDescription>
                  Add an extra layer of security to your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert variant="info">
                  Two-factor authentication is not yet enabled for your account.
                </Alert>
                <div className="mt-4">
                  <Button variant="outline">Enable 2FA</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active Sessions</CardTitle>
                <CardDescription>
                  Manage your active login sessions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Current Session</p>
                      <p className="text-sm text-muted-foreground">
                        Windows - Chrome - Active now
                      </p>
                    </div>
                    <Badge variant="success">Current</Badge>
                  </div>
                </div>
                <div className="mt-4">
                  <Button variant="outline" className="text-destructive">
                    Sign Out All Other Sessions
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
