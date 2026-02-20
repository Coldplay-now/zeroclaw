import { useTranslation } from "react-i18next";
import { Construction } from "lucide-react";

export function ComingSoon({ page }: { page: string }) {
  const { t } = useTranslation("common");
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
      <Construction className="h-12 w-12" />
      <h2 className="text-xl font-semibold">{t(`nav.${page}`)}</h2>
      <p className="text-sm">{t("status.comingSoon")}</p>
    </div>
  );
}
