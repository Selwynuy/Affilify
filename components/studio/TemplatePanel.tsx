"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Upload,
  X,
  Film,
  Camera,
  User,
  Layers,
  Wind,
  CheckCircle2,
  ExternalLink,
  Mars,
  Venus,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotify } from "@/components/feedback/use-notify";
import { usePreferences } from "@/lib/context/preferences-context";
import type { MarketplaceTemplate } from "@/lib/types/marketplace";
import type { AvatarConfig } from "@/lib/types/preferences";
import {
  buildAvatarConfigFromTemplate,
  buildBackgroundConfigFromTemplate,
  buildCustomAvatarConfig,
  buildUserModelAvatarConfig,
} from "@/lib/preferences";
import { getTemplatePrimaryImageUrl } from "@/lib/marketplace-template-media";

export type TemplateCategory =
  | "avatar"
  | "background"
  | "shot_type"
  | "motion_style"
  | "video_flow";

interface UserModel {
  id: string;
  name: string;
  storage_path: string;
  public_url: string;
  gender: string;
}

export interface TemplatePanelProps {
  category: TemplateCategory;
  avatarTemplates: MarketplaceTemplate[];
  backgroundTemplates: MarketplaceTemplate[];
  cameraTemplates: MarketplaceTemplate[];
  movementTemplates: MarketplaceTemplate[];
  videoFlowTemplates: MarketplaceTemplate[];
  onClose: () => void;
}

export function TemplatePanel({
  category,
  avatarTemplates,
  backgroundTemplates,
  cameraTemplates,
  movementTemplates,
  videoFlowTemplates,
  onClose,
}: TemplatePanelProps) {
  const {
    avatarConfig,
    setAvatarConfig,
    backgroundConfig,
    setBackgroundConfig,
    shotTypeTemplateId: cameraTemplateId,
    setShotTypeTemplateId: setCameraTemplateId,
    motionStyleTemplateId: movementTemplateId,
    setMotionStyleTemplateId: setMovementTemplateId,
    videoFlowTemplateId,
    setVideoFlowTemplateId,
  } = usePreferences();

  const notify = useNotify();
  const [isPending, startTransition] = useTransition();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [userModels, setUserModels] = useState<UserModel[]>([]);
  const [userModelsLoading, setUserModelsLoading] = useState(
    category === "avatar",
  );
  const [avatarGender, setAvatarGender] = useState<"male" | "female">(
    avatarConfig?.gender === "woman" ? "female" : "male",
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (category !== "avatar") return;
    fetch("/api/user-models")
      .then((r) => r.json())
      .then((d) => setUserModels(d.models ?? []))
      .catch(() => setUserModels([]))
      .finally(() => setUserModelsLoading(false));
  }, [category]);

  function savePrefs(body: Record<string, unknown>) {
    startTransition(async () => {
      await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setSavingId(null);
    });
  }

  function handleSelectAvatar(template: MarketplaceTemplate) {
    if (isPending) return;
    setSavingId(template.id);
    const config = buildAvatarConfigFromTemplate(template);
    if (!config) return;
    setAvatarConfig(config);
    savePrefs({ avatar_config: config });
    onClose();
  }

  function handleSelectBackground(template: MarketplaceTemplate) {
    if (isPending) return;
    setSavingId(template.id);
    const config = buildBackgroundConfigFromTemplate(template);
    if (!config) return;
    setBackgroundConfig(config);
    savePrefs({ background_config: config });
    onClose();
  }

  function handleSelectCamera(id: string) {
    if (isPending) return;
    setSavingId(id);
    setCameraTemplateId(id);
    savePrefs({
      shot_type_template_id: id,
      motion_style_template_id: movementTemplateId,
    });
    onClose();
  }

  function handleSelectMovement(id: string) {
    if (isPending) return;
    setSavingId(id);
    setMovementTemplateId(id);
    savePrefs({
      shot_type_template_id: cameraTemplateId,
      motion_style_template_id: id,
    });
    onClose();
  }

  function handleSelectVideoFlow(id: string) {
    if (isPending) return;
    setSavingId(id);
    setVideoFlowTemplateId(id);
    savePrefs({
      shot_type_template_id: cameraTemplateId,
      motion_style_template_id: movementTemplateId,
      video_flow_template_id: id,
    });
    onClose();
  }

  async function handleCustomFace(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
    if (!ALLOWED.includes(file.type)) {
      notify.error({
        title: "Unsupported file type",
        description: "Please upload a JPG, PNG, or WebP image.",
      });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      notify.error({
        title: "File too large",
        description: "Face image must be under 10MB.",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      const [meta, b64] = dataUrl.split(",");
      const mime = meta.split(":")[1].split(";")[0];
      const byteString = atob(b64);
      const arr = new Uint8Array(byteString.length);
      for (let i = 0; i < byteString.length; i++)
        arr[i] = byteString.charCodeAt(i);
      const blob = new Blob([arr], { type: mime });
      const formData = new FormData();
      formData.append("face", blob, "face.jpg");
      formData.append("onboardingFaceOnly", "true");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok && data.faceUrl) {
        const config = buildCustomAvatarConfig(data.faceUrl, data.facePath);
        setAvatarConfig(config);
        await fetch("/api/preferences", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatar_config: config }),
        });
        onClose();
      } else {
        notify.error({
          title: "Upload failed",
          description: data?.error ?? "Could not upload face image.",
        });
      }
    };
    reader.readAsDataURL(file);
  }

  function handleSelectUserModel(model: UserModel) {
    const gender: AvatarConfig["gender"] =
      model.gender === "woman" ? "woman" : "man";
    const config = buildUserModelAvatarConfig(
      model.id,
      model.storage_path,
      gender,
    );
    setAvatarConfig(config);
    startTransition(async () => {
      await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_config: config }),
      });
    });
    onClose();
  }

  const CATEGORY_META: Record<
    TemplateCategory,
    { label: string; icon: React.ElementType }
  > = {
    avatar: { label: "Avatar", icon: User },
    background: { label: "Background", icon: Layers },
    shot_type: { label: "Shot Type", icon: Camera },
    motion_style: { label: "Motion Style", icon: Wind },
    video_flow: { label: "Video Flow", icon: Film },
  };
  const meta = CATEGORY_META[category];

  const visibleAvatars = avatarTemplates.filter((t) =>
    avatarGender === "female"
      ? t.config.gender === "woman"
      : t.config.gender !== "woman",
  );

  const templates: MarketplaceTemplate[] =
    category === "avatar"
      ? visibleAvatars
      : category === "background"
        ? backgroundTemplates
        : category === "shot_type"
          ? cameraTemplates
          : category === "motion_style"
            ? movementTemplates
            : videoFlowTemplates;

  function isSelected(t: MarketplaceTemplate) {
    if (category === "shot_type") return t.id === cameraTemplateId;
    if (category === "motion_style") return t.id === movementTemplateId;
    if (category === "video_flow") return t.id === videoFlowTemplateId;
    if (category === "avatar")
      return avatarConfig?.type === "preset" && avatarConfig.presetId === t.id;
    if (category === "background")
      return (
        backgroundConfig?.type === "preset" &&
        backgroundConfig.presetId === t.id
      );
    return false;
  }

  function handleSelect(t: MarketplaceTemplate) {
    if (category === "avatar") handleSelectAvatar(t);
    if (category === "background") handleSelectBackground(t);
    if (category === "shot_type") handleSelectCamera(t.id);
    if (category === "motion_style") handleSelectMovement(t.id);
    if (category === "video_flow") handleSelectVideoFlow(t.id);
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 bg-black/30 z-[520]"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 300 }}
        className={cn(
          "fixed right-0 top-0 bottom-0 z-[530] flex flex-col",
          "w-full sm:w-[320px]",
          "bg-[#111119] border-l border-white/[0.07]",
        )}
        style={{ boxShadow: "-24px 0 64px rgba(0,0,0,0.55)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2">
            <meta.icon size={14} className="text-brand-accent" />
            <h3 className="text-sm font-semibold text-white">{meta.label}</h3>
            <span className="text-[10px] text-white/30 font-mono">
              {templates.length} templates
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/templates"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-white/25 hover:text-white/60 hover:bg-white/[0.06] transition-all"
              title="Open full templates page"
            >
              <ExternalLink size={13} />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.07] transition-all"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Avatar gender toggle */}
        {category === "avatar" && (
          <div className="px-5 pt-3 pb-1 shrink-0">
            <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
              <button
                type="button"
                onClick={() => setAvatarGender("male")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-all",
                  avatarGender === "male"
                    ? "bg-brand-accent/20 text-brand-accent border border-brand-accent/30"
                    : "text-white/35 hover:text-white/60",
                )}
              >
                <Mars size={11} /> Male
              </button>
              <button
                type="button"
                onClick={() => setAvatarGender("female")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-all",
                  avatarGender === "female"
                    ? "bg-brand-accent/20 text-brand-accent border border-brand-accent/30"
                    : "text-white/35 hover:text-white/60",
                )}
              >
                <Venus size={11} /> Female
              </button>
            </div>
            <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.12] bg-white/[0.02] py-2.5 text-[11px] text-white/35 transition-colors hover:border-brand-accent/30 hover:text-brand-accent/70">
              <Upload size={11} />
              {avatarConfig?.type === "custom"
                ? "Replace custom face"
                : "Upload custom face"}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCustomFace}
              />
            </label>
          </div>
        )}

        {/* Template grid */}
        <div className="flex-1 overflow-y-auto min-h-0 px-4 py-3 scrollbar-brand">
          {category === "avatar" && (userModelsLoading || userModels.length > 0) && (
            <div className="mb-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30 mb-2">
                My Faces
              </p>
              {userModelsLoading ? (
                <div className="flex items-center gap-2 text-[11px] text-white/25 py-2">
                  <RefreshCw size={11} className="animate-spin" />
                  Loading…
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  {userModels.map((model) => {
                    const selected =
                      avatarConfig?.type === "user_model" &&
                      avatarConfig.userModelId === model.id;
                    return (
                      <div
                        key={model.id}
                        onClick={() => handleSelectUserModel(model)}
                        className={cn(
                          "group relative flex flex-col overflow-hidden rounded-xl border transition-all duration-150 cursor-pointer",
                          selected
                            ? "border-brand-accent ring-1 ring-brand-accent/40 shadow-md shadow-brand-accent/10"
                            : "border-white/[0.08] hover:border-white/20",
                        )}
                      >
                        <div className="relative aspect-[2/3] w-full overflow-hidden bg-white/5">
                          {model.public_url ? (
                            <img
                              src={model.public_url}
                              alt={model.name}
                              className="absolute inset-0 h-full w-full object-cover"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <User size={24} className="text-white/10" />
                            </div>
                          )}
                          {selected && (
                            <div className="absolute inset-0 bg-brand-accent/10" />
                          )}
                          <div
                            className={cn(
                              "absolute inset-x-1.5 bottom-1.5 transition-all duration-150",
                              selected
                                ? "opacity-100 translate-y-0"
                                : "opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0",
                            )}
                          >
                            <div className="flex w-full items-center justify-center gap-1 rounded-lg py-1 text-[10px] font-bold uppercase tracking-wider bg-brand-accent text-brand-bg">
                              {selected ? (
                                <><CheckCircle2 size={10} /> Active</>
                              ) : (
                                "Use this"
                              )}
                            </div>
                          </div>
                        </div>
                        <div
                          className={cn(
                            "px-2 py-1.5 border-t text-[10px] font-medium truncate transition-colors",
                            selected
                              ? "border-brand-accent/30 bg-brand-accent/8 text-brand-accent"
                              : "border-white/[0.06] bg-[#15151e] text-white/50",
                          )}
                        >
                          {model.name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="mt-3 mb-1 border-t border-white/[0.06]" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30 mt-3 mb-2">
                Templates
              </p>
            </div>
          )}

          {templates.length === 0 ? (
            <p className="text-center text-[12px] text-white/25 py-10">
              No templates yet
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {templates.map((t, i) => {
                const selected = isSelected(t);
                const saving = savingId === t.id;
                const templateImageUrl = getTemplatePrimaryImageUrl(t);
                return (
                  <div
                    key={t.id}
                    onClick={() => handleSelect(t)}
                    className={cn(
                      "group relative flex flex-col overflow-hidden rounded-xl border transition-all duration-150 cursor-pointer",
                      selected
                        ? "border-brand-accent ring-1 ring-brand-accent/40 shadow-md shadow-brand-accent/10"
                        : "border-white/[0.08] hover:border-white/20",
                    )}
                  >
                    <div className="relative aspect-[2/3] w-full overflow-hidden bg-white/5">
                      {templateImageUrl ? (
                        <img
                          src={templateImageUrl}
                          alt={t.title}
                          loading={i < 4 ? "eager" : "lazy"}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <meta.icon size={24} className="text-white/10" />
                        </div>
                      )}
                      {t.badge && (
                        <div className="absolute left-1.5 top-1.5 rounded-full bg-brand-accent/90 px-1.5 py-0.5 text-[8px] font-semibold text-brand-bg">
                          {t.badge}
                        </div>
                      )}
                      {selected && (
                        <div className="absolute inset-0 bg-brand-accent/10" />
                      )}
                      <div
                        className={cn(
                          "absolute inset-x-1.5 bottom-1.5 transition-all duration-150",
                          selected
                            ? "opacity-100 translate-y-0"
                            : "opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0",
                        )}
                      >
                        <div className="flex w-full items-center justify-center gap-1 rounded-lg py-1 text-[10px] font-bold uppercase tracking-wider bg-brand-accent text-brand-bg">
                          {saving ? (
                            "..."
                          ) : selected ? (
                            <><CheckCircle2 size={10} /> Active</>
                          ) : (
                            "Use this"
                          )}
                        </div>
                      </div>
                    </div>
                    <div
                      className={cn(
                        "px-2 py-1.5 border-t text-[10px] font-medium truncate transition-colors",
                        selected
                          ? "border-brand-accent/30 bg-brand-accent/8 text-brand-accent"
                          : "border-white/[0.06] bg-[#15151e] text-white/50",
                      )}
                    >
                      {t.title}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.aside>
    </>
  );
}

export function TemplatePanelPortal({
  open,
  category,
  avatarTemplates,
  backgroundTemplates,
  cameraTemplates,
  movementTemplates,
  videoFlowTemplates,
  onClose,
}: { open: boolean } & TemplatePanelProps) {
  return (
    <AnimatePresence>
      {open && (
        <TemplatePanel
          key={category}
          category={category}
          avatarTemplates={avatarTemplates}
          backgroundTemplates={backgroundTemplates}
          cameraTemplates={cameraTemplates}
          movementTemplates={movementTemplates}
          videoFlowTemplates={videoFlowTemplates}
          onClose={onClose}
        />
      )}
    </AnimatePresence>
  );
}
