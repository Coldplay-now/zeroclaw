import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { getSkillsList, getSkillDetail, type SkillDetail } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  Puzzle,
  Wrench,
  FileText,
  Tag,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";

export function Skills() {
  const { t } = useTranslation("skills");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);

  const skillsQuery = useQuery({
    queryKey: ["skills"],
    queryFn: getSkillsList,
    refetchInterval: 30_000,
  });

  const detailQuery = useQuery({
    queryKey: ["skill-detail", expandedSkill],
    queryFn: () => getSkillDetail(expandedSkill!),
    enabled: !!expandedSkill,
  });

  if (skillsQuery.isLoading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-24 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (skillsQuery.error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">{t("title")}</h1>
        <Card>
          <CardContent className="p-6 flex items-center gap-3 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>{skillsQuery.error?.message || t("loadError")}</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  const skills = skillsQuery.data?.skills ?? [];
  const filtered = searchQuery
    ? skills.filter(
        (s) =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.tags.some((tag) =>
            tag.toLowerCase().includes(searchQuery.toLowerCase()),
          ),
      )
    : skills;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <span className="text-sm text-muted-foreground">
          {skills.length} {t("installed")}
        </span>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="w-full pl-10 pr-4 py-2 rounded border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Skills Grid */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            {skills.length === 0 ? t("noSkills") : t("noResults")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((skill) => (
            <Card
              key={skill.name}
              className={`cursor-pointer transition-colors hover:border-ring ${
                expandedSkill === skill.name ? "border-ring" : ""
              }`}
              onClick={() =>
                setExpandedSkill(
                  expandedSkill === skill.name ? null : skill.name,
                )
              }
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Puzzle className="h-4 w-4" />
                    <span>{skill.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-normal">
                    v{skill.version}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {skill.description}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Wrench className="h-3 w-3" />
                    {skill.tools_count} {t("tools")}
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {skill.prompts_count} {t("prompts")}
                  </span>
                </div>
                {skill.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {skill.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground flex items-center gap-0.5"
                      >
                        <Tag className="h-2.5 w-2.5" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Panel */}
      {expandedSkill && (
        <SkillDetailPanel
          name={expandedSkill}
          detail={detailQuery.data ?? null}
          isLoading={detailQuery.isLoading}
          onClose={() => setExpandedSkill(null)}
        />
      )}
    </div>
  );
}

function SkillDetailPanel({
  name,
  detail,
  isLoading,
  onClose,
}: {
  name: string;
  detail: SkillDetail | null;
  isLoading: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation("skills");
  const [toolsExpanded, setToolsExpanded] = useState(true);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between">
          <span>{name}</span>
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t("close")}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-20 bg-muted animate-pulse rounded" />
        ) : detail ? (
          <div className="space-y-4">
            <p className="text-sm">{detail.description}</p>

            {detail.author && (
              <p className="text-xs text-muted-foreground">
                {t("author")}: {detail.author}
              </p>
            )}

            {/* Tools */}
            {detail.tools.length > 0 && (
              <div>
                <button
                  className="flex items-center gap-1 text-sm font-medium mb-2"
                  onClick={() => setToolsExpanded(!toolsExpanded)}
                >
                  {toolsExpanded ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                  {t("toolsList")} ({detail.tools.length})
                </button>
                {toolsExpanded && (
                  <div className="space-y-2 pl-4">
                    {detail.tools.map((tool) => (
                      <div
                        key={tool.name}
                        className="p-2 rounded border text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <Wrench className="h-3 w-3" />
                          <span className="font-medium">{tool.name}</span>
                          <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
                            {tool.kind}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {tool.description}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Prompts */}
            {detail.prompts.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">
                  {t("promptsList")} ({detail.prompts.length})
                </p>
                <div className="space-y-1 pl-4">
                  {detail.prompts.map((p, i) => (
                    <p
                      key={i}
                      className="text-xs text-muted-foreground font-mono"
                    >
                      {p}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("notFound")}</p>
        )}
      </CardContent>
    </Card>
  );
}
