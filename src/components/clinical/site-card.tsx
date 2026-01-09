"use client";

import Link from "next/link";
import { Card, CardContent, Badge, Button } from "@/components/ui";
import {
  Building2,
  Ambulance,
  Flame,
  Stethoscope,
  MapPin,
  Phone,
  Mail,
  Users,
  MoreVertical,
  Pencil,
  Trash2,
  Calendar,
} from "lucide-react";
import type { ClinicalSite, ClinicalSiteType } from "@/types";

interface SiteCardProps {
  site: ClinicalSite;
  onEdit?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
}

const SITE_ICONS: Record<ClinicalSiteType, React.ReactNode> = {
  hospital: <Building2 className="h-6 w-6" />,
  ambulance_service: <Ambulance className="h-6 w-6" />,
  fire_department: <Flame className="h-6 w-6" />,
  urgent_care: <Stethoscope className="h-6 w-6" />,
  other: <Building2 className="h-6 w-6" />,
};

const SITE_TYPE_LABELS: Record<ClinicalSiteType, string> = {
  hospital: "Hospital",
  ambulance_service: "Ambulance Service",
  fire_department: "Fire Department",
  urgent_care: "Urgent Care",
  other: "Other",
};

export function SiteCard({
  site,
  onEdit,
  onDelete,
  showActions = true,
}: SiteCardProps) {
  const address = [site.city, site.state].filter(Boolean).join(", ");

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              {SITE_ICONS[site.site_type]}
            </div>
            <div>
              <h3 className="font-semibold text-lg">{site.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary">
                  {SITE_TYPE_LABELS[site.site_type]}
                </Badge>
                {!site.is_active && (
                  <Badge variant="outline" className="text-muted-foreground">
                    Inactive
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {showActions && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" asChild>
                <Link href={`/admin/clinical-sites/${site.id}/shifts`}>
                  <Calendar className="h-4 w-4" />
                </Link>
              </Button>
              {onEdit && (
                <Button variant="ghost" size="icon" onClick={onEdit}>
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={onDelete}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          {(site.address || address) && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span>
                {site.address}
                {site.address && address && ", "}
                {address}
                {site.zip && ` ${site.zip}`}
              </span>
            </div>
          )}

          {site.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 flex-shrink-0" />
              <a href={`tel:${site.phone}`} className="hover:text-primary">
                {site.phone}
              </a>
            </div>
          )}

          {site.contact_email && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 flex-shrink-0" />
              <a
                href={`mailto:${site.contact_email}`}
                className="hover:text-primary"
              >
                {site.contact_email}
              </a>
            </div>
          )}

          {site.preceptors && site.preceptors.length > 0 && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 flex-shrink-0" />
              <span>
                {site.preceptors.length} preceptor
                {site.preceptors.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>

        {site.notes && (
          <p className="mt-4 text-sm text-muted-foreground border-t pt-4">
            {site.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
