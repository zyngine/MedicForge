"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Award, Loader2 } from "lucide-react";
import {
  Button,
  Input,
  Label,
  Modal,
  ModalFooter,
  Select,
} from "@/components/ui";
import { useIssueCertificate, useCertificateTemplates } from "@/lib/hooks/use-certificates";

const formSchema = z.object({
  certificate_type: z.string().min(1),
  title: z.string().optional(),
  completion_date: z.string().min(1, "Completion date is required"),
  final_grade: z.string().optional(),
  hours_completed: z.string().optional(),
  template_id: z.string().optional(),
  expires_at: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface IssueCertificateFormProps {
  studentId: string;
  studentName: string;
  courseId: string;
  courseName: string;
  defaultGrade?: number;
  defaultHours?: number;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function IssueCertificateForm({
  studentId,
  studentName,
  courseId,
  courseName,
  defaultGrade,
  defaultHours,
  open,
  onClose,
  onSuccess,
}: IssueCertificateFormProps) {
  const issueCertificate = useIssueCertificate();
  const { data: templates } = useCertificateTemplates();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      certificate_type: "completion",
      title: "",
      completion_date: new Date().toISOString().split("T")[0],
      final_grade: defaultGrade?.toString() || "",
      hours_completed: defaultHours?.toString() || "",
      template_id: "",
      expires_at: "",
    },
  });

  const handleSubmit = async (data: FormData) => {
    try {
      await issueCertificate.mutateAsync({
        student_id: studentId,
        course_id: courseId,
        certificate_type: data.certificate_type,
        title: data.title || undefined,
        completion_date: data.completion_date,
        final_grade: data.final_grade ? parseFloat(data.final_grade) : undefined,
        hours_completed: data.hours_completed ? parseFloat(data.hours_completed) : undefined,
        template_id: data.template_id || undefined,
        expires_at: data.expires_at || undefined,
      });

      onSuccess?.();
      onClose();
      form.reset();
    } catch (error) {
      console.error("Failed to issue certificate:", error);
    }
  };

  const typeOptions = [
    { value: "completion", label: "Course Completion" },
    { value: "continuing_education", label: "Continuing Education" },
    { value: "skill_verification", label: "Skill Verification" },
  ];

  const templateOptions = [
    { value: "", label: "Use Default" },
    ...(templates?.map((t) => ({ value: t.id, label: t.name })) || []),
  ];

  return (
    <Modal isOpen={open} onClose={onClose} title="Issue Certificate">
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-sm font-medium">{studentName}</p>
          <p className="text-sm text-muted-foreground">{courseName}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="certificate_type">Certificate Type</Label>
          <Select
            options={typeOptions}
            value={form.watch("certificate_type")}
            onChange={(value) => form.setValue("certificate_type", value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Custom Title (Optional)</Label>
          <Input
            id="title"
            placeholder="Leave blank for default title"
            {...form.register("title")}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="completion_date">Completion Date *</Label>
            <Input
              id="completion_date"
              type="date"
              {...form.register("completion_date")}
            />
            {form.formState.errors.completion_date && (
              <p className="text-sm text-destructive">
                {form.formState.errors.completion_date.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="expires_at">Expires On (Optional)</Label>
            <Input
              id="expires_at"
              type="date"
              {...form.register("expires_at")}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="final_grade">Final Grade (%)</Label>
            <Input
              id="final_grade"
              type="number"
              min="0"
              max="100"
              step="0.1"
              placeholder="95.5"
              {...form.register("final_grade")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hours_completed">Hours Completed</Label>
            <Input
              id="hours_completed"
              type="number"
              min="0"
              step="0.5"
              placeholder="120"
              {...form.register("hours_completed")}
            />
          </div>
        </div>

        {templates && templates.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="template_id">Certificate Template</Label>
            <Select
              options={templateOptions}
              value={form.watch("template_id") || ""}
              onChange={(value) => form.setValue("template_id", value)}
            />
          </div>
        )}

        <ModalFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={issueCertificate.isPending}>
            {issueCertificate.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Issuing...
              </>
            ) : (
              <>
                <Award className="h-4 w-4 mr-2" />
                Issue Certificate
              </>
            )}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
