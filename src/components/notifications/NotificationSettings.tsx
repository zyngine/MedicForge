"use client";

import { useState } from "react";
import { Bell, BellOff, Mail, Clock, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Label,
  Switch,
  Input,
} from "@/components/ui";
import {
  usePushSubscription,
  useNotificationPreferences,
  useNotificationPermission,
  type NotificationPreferences,
} from "@/lib/hooks/use-push-notifications";

export function NotificationSettings() {
  const {
    isPushSupported,
    isSubscribed,
    isLoading: isLoadingSubscription,
    subscribe,
    unsubscribe,
    isSubscribing,
    isUnsubscribing,
  } = usePushSubscription();

  const { permission, isSupported: isNotificationSupported } =
    useNotificationPermission();

  const {
    preferences,
    isLoading: isLoadingPreferences,
    updatePreferences,
    isUpdating,
  } = useNotificationPreferences();

  const [error, setError] = useState<string | null>(null);

  const handleTogglePush = async () => {
    setError(null);
    try {
      if (isSubscribed) {
        await unsubscribe();
      } else {
        await subscribe();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle push notifications");
    }
  };

  const handlePreferenceChange = async (
    key: string,
    value: boolean | string
  ) => {
    if (!preferences) return;
    try {
      await updatePreferences({ [key]: value } as Partial<NotificationPreferences>);
    } catch (err) {
      console.error("Failed to update preference:", err);
    }
  };

  const isLoading = isLoadingSubscription || isLoadingPreferences;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Push Notification Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Receive instant notifications on your device
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isNotificationSupported ? (
            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
              <BellOff className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Push notifications are not supported in your browser.
              </p>
            </div>
          ) : permission === "denied" ? (
            <div className="flex items-center gap-3 p-4 bg-destructive/10 rounded-lg">
              <BellOff className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm font-medium text-destructive">
                  Notifications Blocked
                </p>
                <p className="text-sm text-muted-foreground">
                  You have blocked notifications. Please enable them in your browser settings.
                </p>
              </div>
            </div>
          ) : !isPushSupported ? (
            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
              <BellOff className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Push notifications require the service worker to be active.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Enable Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified about new assignments, grades, and announcements
                  </p>
                </div>
                <Button
                  onClick={handleTogglePush}
                  disabled={isSubscribing || isUnsubscribing}
                  variant={isSubscribed ? "destructive" : "default"}
                >
                  {isSubscribing || isUnsubscribing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isSubscribed ? (
                    <>
                      <BellOff className="h-4 w-4 mr-2" />
                      Disable
                    </>
                  ) : (
                    <>
                      <Bell className="h-4 w-4 mr-2" />
                      Enable
                    </>
                  )}
                </Button>
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg">
                  {error}
                </div>
              )}

              {isSubscribed && preferences && (
                <div className="pt-4 border-t space-y-4">
                  <p className="text-sm font-medium">Notification Categories</p>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="push_assignments" className="text-sm font-normal">
                        Assignment notifications
                      </Label>
                      <Switch
                        id="push_assignments"
                        checked={preferences.push_assignments}
                        onCheckedChange={(checked) =>
                          handlePreferenceChange("push_assignments", checked)
                        }
                        disabled={isUpdating}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="push_grades" className="text-sm font-normal">
                        Grade notifications
                      </Label>
                      <Switch
                        id="push_grades"
                        checked={preferences.push_grades}
                        onCheckedChange={(checked) =>
                          handlePreferenceChange("push_grades", checked)
                        }
                        disabled={isUpdating}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="push_announcements" className="text-sm font-normal">
                        Announcement notifications
                      </Label>
                      <Switch
                        id="push_announcements"
                        checked={preferences.push_announcements}
                        onCheckedChange={(checked) =>
                          handlePreferenceChange("push_announcements", checked)
                        }
                        disabled={isUpdating}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="push_reminders" className="text-sm font-normal">
                        Reminder notifications
                      </Label>
                      <Switch
                        id="push_reminders"
                        checked={preferences.push_reminders}
                        onCheckedChange={(checked) =>
                          handlePreferenceChange("push_reminders", checked)
                        }
                        disabled={isUpdating}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="push_messages" className="text-sm font-normal">
                        Message notifications
                      </Label>
                      <Switch
                        id="push_messages"
                        checked={preferences.push_messages}
                        onCheckedChange={(checked) =>
                          handlePreferenceChange("push_messages", checked)
                        }
                        disabled={isUpdating}
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Email Notification Section */}
      {preferences && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Notifications
            </CardTitle>
            <CardDescription>
              Receive notifications via email
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Enable Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive important updates in your inbox
                </p>
              </div>
              <Switch
                checked={preferences.email_enabled}
                onCheckedChange={(checked) =>
                  handlePreferenceChange("email_enabled", checked)
                }
                disabled={isUpdating}
              />
            </div>

            {preferences.email_enabled && (
              <div className="pt-4 border-t space-y-4">
                <p className="text-sm font-medium">Email Categories</p>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email_assignments" className="text-sm font-normal">
                      Assignment emails
                    </Label>
                    <Switch
                      id="email_assignments"
                      checked={preferences.email_assignments}
                      onCheckedChange={(checked) =>
                        handlePreferenceChange("email_assignments", checked)
                      }
                      disabled={isUpdating}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="email_grades" className="text-sm font-normal">
                      Grade emails
                    </Label>
                    <Switch
                      id="email_grades"
                      checked={preferences.email_grades}
                      onCheckedChange={(checked) =>
                        handlePreferenceChange("email_grades", checked)
                      }
                      disabled={isUpdating}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="email_announcements" className="text-sm font-normal">
                      Announcement emails
                    </Label>
                    <Switch
                      id="email_announcements"
                      checked={preferences.email_announcements}
                      onCheckedChange={(checked) =>
                        handlePreferenceChange("email_announcements", checked)
                      }
                      disabled={isUpdating}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="email_messages" className="text-sm font-normal">
                      Message emails
                    </Label>
                    <Switch
                      id="email_messages"
                      checked={preferences.email_messages}
                      onCheckedChange={(checked) =>
                        handlePreferenceChange("email_messages", checked)
                      }
                      disabled={isUpdating}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quiet Hours Section */}
      {preferences && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Quiet Hours
            </CardTitle>
            <CardDescription>
              Silence notifications during specific hours
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Enable Quiet Hours</Label>
                <p className="text-sm text-muted-foreground">
                  Pause notifications during your rest time
                </p>
              </div>
              <Switch
                checked={preferences.quiet_hours_enabled}
                onCheckedChange={(checked) =>
                  handlePreferenceChange("quiet_hours_enabled", checked)
                }
                disabled={isUpdating}
              />
            </div>

            {preferences.quiet_hours_enabled && (
              <div className="pt-4 border-t">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quiet_start">Start Time</Label>
                    <Input
                      id="quiet_start"
                      type="time"
                      value={preferences.quiet_hours_start || "22:00"}
                      onChange={(e) =>
                        handlePreferenceChange("quiet_hours_start", e.target.value)
                      }
                      disabled={isUpdating}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quiet_end">End Time</Label>
                    <Input
                      id="quiet_end"
                      type="time"
                      value={preferences.quiet_hours_end || "07:00"}
                      onChange={(e) =>
                        handlePreferenceChange("quiet_hours_end", e.target.value)
                      }
                      disabled={isUpdating}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
