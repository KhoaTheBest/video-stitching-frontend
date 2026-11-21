import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { CodeBracketIcon, DocumentPlusIcon, ListBulletIcon, SpeakerXMarkIcon } from '@heroicons/react/24/outline';
import { Badge } from '@astryxdesign/core/Badge';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { FileInput } from '@astryxdesign/core/FileInput';
import { Grid } from '@astryxdesign/core/Grid';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { Icon } from '@astryxdesign/core/Icon';
import { HStack, Layout, LayoutContent, LayoutPanel, VStack } from '@astryxdesign/core/Layout';
import { Link } from '@astryxdesign/core/Link';
import { List, ListItem } from '@astryxdesign/core/List';
import { Section } from '@astryxdesign/core/Section';
import { Selector } from '@astryxdesign/core/Selector';
import { Spinner } from '@astryxdesign/core/Spinner';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { Heading, Text } from '@astryxdesign/core/Text';
import samples from '../data/video_cutdown_results.json';
import { ExportPanel } from '../components/ExportPanel';
import { ProDialog, type ProDialogMode } from '../components/ProDialog';
import { SegmentEditor } from '../components/SegmentEditor';
import { SegmentPreview } from '../components/SegmentPreview';
import { APP_NAME, FREE_LIMITS } from '../config/plans';
import { addVideos, emptyProject, moveSegment, removeSegment, updateSegment } from '../engine/edit';
import { parseProject, planStitch, PlanError, type StitchPlan } from '../engine/plan';
import { useEntitlements } from '../licensing/useEntitlements';
import { formatTime } from '../lib/format';
import { readStored, writeStored } from '../lib/storage';
import { readVideoMeta } from '../lib/videoMeta';
import { usePageMeta } from '../router';
import type { SampleData, VideoCutdownResult } from '../types';

const JsonEditor = lazy(() => import('../components/JsonEditor'));

const SAMPLES = (samples as unknown as SampleData[]).map((s) => s.video_cutdown_result);
const SAMPLE_KEY = 'selectedProjectIndex';

function initialSampleIndex(): number {
  const saved = Number.parseInt(readStored(SAMPLE_KEY) ?? '', 10);
  return saved >= 0 && saved < SAMPLES.length ? saved : 0;
}

const toJson = (project: VideoCutdownResult) => JSON.stringify({ video_cutdown_result: project }, null, 2);

function slug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'stitched';
}

type PanelTab = 'segments' | 'json';
/** A video picked from disk: kept in memory for this session only. */
type LocalFile = { file: File; url: string };

export function WorkspacePage() {
  const [sampleIndex, setSampleIndex] = useState<number | null>(initialSampleIndex);
  const [project, setProjectState] = useState<VideoCutdownResult>(() => SAMPLES[sampleIndex ?? 0]);
  const [jsonText, setJsonText] = useState(() => toJson(project));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [tab, setTab] = useState<PanelTab>('segments');
  const [selected, setSelected] = useState<number | null>(null);
  const [localFiles, setLocalFiles] = useState<ReadonlyMap<number, LocalFile>>(new Map());
  const [fileError, setFileError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [dialog, setDialog] = useState<ProDialogMode | null>(null);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const entitlements = useEntitlements();
  usePageMeta(`Editor · ${APP_NAME}`, 'Trim and stitch video segments in your browser.');

  // Free the blob URLs of picked files when the editor closes.
  const localFilesRef = useRef(localFiles);
  useEffect(() => {
    localFilesRef.current = localFiles;
  }, [localFiles]);
  useEffect(() => () => localFilesRef.current.forEach((f) => URL.revokeObjectURL(f.url)), []);

  /** Every edit goes through here so the JSON tab always shows the current project. */
  const setProject = (next: VideoCutdownResult) => {
    setProjectState(next);
    setJsonText(toJson(next));
    setJsonError(null);
  };

  const { plan, planError } = useMemo((): { plan: StitchPlan | null; planError: string | null } => {
    try {
      const missing = project.source_files.find((s) => s.url.startsWith('local:') && !localFiles.has(s.source_id));
      if (missing) {
        throw new PlanError(`Add "${missing.url.slice('local:'.length)}" again: picked files are not kept after a reload.`);
      }
      return { plan: planStitch(project, entitlements.limits), planError: null };
    } catch (e) {
      return { plan: null, planError: (e as Error).message };
    }
  }, [project, entitlements.limits, localFiles]);
  const isPro = entitlements.plan === 'pro';
  const overLimits = plan !== null && plan.violations.length > 0;
  const fileBlobs = useMemo(() => new Map([...localFiles].map(([id, f]) => [id, f.file])), [localFiles]);

  const loadSample = (value: string) => {
    const index = Number(value);
    setSampleIndex(index);
    writeStored(SAMPLE_KEY, String(index));
    setSelected(null);
    setProject(SAMPLES[index]);
  };

  const startEmpty = () => {
    setSampleIndex(null);
    setSelected(null);
    setProject(emptyProject());
  };

  const addFiles = async (picked: File | File[] | null) => {
    const files = picked === null ? [] : Array.isArray(picked) ? picked : [picked];
    if (files.length === 0) return;
    setIsAdding(true);
    setFileError(null);
    const opened: LocalFile[] = [];
    const metas = [];
    for (const file of files) {
      const url = URL.createObjectURL(file);
      try {
        metas.push(await readVideoMeta(file, url));
        opened.push({ file, url });
      } catch (e) {
        URL.revokeObjectURL(url);
        setFileError((e as Error).message);
      }
    }
    if (metas.length > 0) {
      const { project: next, sourceIds } = addVideos(project, metas);
      setLocalFiles((prev) => new Map([...prev, ...sourceIds.map((id, i) => [id, opened[i]] as const)]));
      setSampleIndex(null);
      setProject(next);
    }
    setIsAdding(false);
  };

  const applyJson = () => {
    try {
      setProject(parseProject(jsonText));
      setSelected(null);
    } catch (e) {
      setJsonError((e as Error).message);
    }
  };

  const sourceUrl = (sourceId: number) => {
    const local = localFiles.get(sourceId);
    if (local) return local.url;
    const url = project.source_files.find((s) => s.source_id === sourceId)?.url ?? null;
    return url && !url.startsWith('local:') ? url : null;
  };

  const freeNotice = isPro ? undefined : (
    <Banner
      status="info"
      title={`Free plan: up to ${FREE_LIMITS.maxSegments} segments, ${FREE_LIMITS.maxOutputSeconds} s, ${FREE_LIMITS.maxShortSide}p, with a watermark`}
      endContent={<Button label="Upgrade" size="sm" variant="secondary" onClick={() => setDialog('upgrade')} />}
    />
  );

  const selectedSegment = selected !== null ? project.segments[selected] : undefined;

  const segmentsTab = (
    <VStack gap={4}>
      <FileInput
        label="Add videos"
        description="Files stay on this device."
        accept="video/*"
        isMultiple
        mode="dropzone"
        value={[]}
        onChange={addFiles}
        isLoading={isAdding}
        status={fileError ? { type: 'error', message: fileError } : undefined}
      />
      {project.segments.length > 0 ? (
        <List density="balanced" hasDividers={false}>
          {project.segments.map((segment, i) => (
            <ListItem
              key={`${segment.scene_id}-${i}`}
              label={`${i + 1}. ${segment.purpose || `Scene ${segment.scene_id}`}`}
              description={`${formatTime(segment.start_ms / 1000)} – ${formatTime(segment.end_ms / 1000)}`}
              isSelected={i === selected}
              onClick={() => setSelected(i === selected ? null : i)}
              endContent={segment.muted ? <Icon icon={SpeakerXMarkIcon} color="secondary" size="sm" /> : undefined}
            />
          ))}
        </List>
      ) : (
        <EmptyState title="No segments yet" description="Add videos above, or pick a sample project." isCompact />
      )}
      {selected !== null && selectedSegment && (
        <Section variant="muted" padding={3}>
          <SegmentEditor
            segment={selectedSegment}
            sourceDurationSec={project.source_files.find((s) => s.source_id === selectedSegment.source_id)?.duration_sec}
            isFirst={selected === 0}
            isLast={selected === project.segments.length - 1}
            onChange={(patch) => setProject(updateSegment(project, selected, patch))}
            onMove={(delta) => {
              const target = selected + delta;
              setProject(moveSegment(project, selected, delta));
              setSelected(target);
            }}
            onRemove={() => {
              setProject(removeSegment(project, selected));
              setSelected(null);
            }}
          />
        </Section>
      )}
    </VStack>
  );

  const panel = (
    <LayoutPanel hasDivider={!isMobile} padding={0} width={isMobile ? '100%' : 360} label="Project">
      <VStack gap={0}>
        <Section variant="transparent" padding={4}>
          <VStack gap={3}>
            <HStack gap={2} vAlign="center" hAlign="between">
              <Link href="/">{APP_NAME}</Link>
              <Button
                label={isPro ? 'Pro' : 'Enter licence key'}
                size="sm"
                variant="ghost"
                endContent={isPro ? <Badge variant="success" label="Active" /> : undefined}
                onClick={() => setDialog('license')}
              />
            </HStack>
            <Heading level={2}>{project.project_name || 'Untitled project'}</Heading>
            <HStack gap={2} vAlign="end">
              <Selector
                label="Sample project"
                placeholder="Choose a sample"
                options={SAMPLES.map((p, i) => ({ value: String(i), label: p.project_name || `Project ${i + 1}` }))}
                value={sampleIndex === null ? undefined : String(sampleIndex)}
                onChange={loadSample}
                width="100%"
              />
              <Button label="New project" icon={<Icon icon={DocumentPlusIcon} />} isIconOnly tooltip="New empty project" onClick={startEmpty} />
            </HStack>
          </VStack>
        </Section>
        <TabList value={tab} onChange={(v: string) => setTab(v as PanelTab)} layout="fill" hasDivider>
          <Tab value="segments" label="Segments" icon={<Icon icon={ListBulletIcon} size="sm" />} />
          <Tab value="json" label="JSON" icon={<Icon icon={CodeBracketIcon} size="sm" />} />
        </TabList>
        <Section variant="transparent" padding={tab === 'json' ? 2 : 4}>
          {tab === 'segments' ? (
            segmentsTab
          ) : (
            <VStack gap={2}>
              {jsonError && <Banner status="error" title="Changes not applied" description={jsonError} role="alert" />}
              <Suspense fallback={<Spinner label="Loading editor" />}>
                <JsonEditor value={jsonText} onChange={setJsonText} onApply={applyJson} />
              </Suspense>
            </VStack>
          )}
        </Section>
      </VStack>
    </LayoutPanel>
  );

  return (
    <>
      <ProDialog mode={dialog} onModeChange={setDialog} entitlements={entitlements} violations={plan?.violations} />
      <Layout
        height="auto"
        header={isMobile ? panel : undefined}
        start={isMobile ? undefined : panel}
        content={
          <LayoutContent padding={isMobile ? 4 : 8}>
            <VStack gap={8} maxWidth={1100}>
              <ExportPanel
                plan={plan}
                planError={project.segments.length === 0 ? null : planError}
                files={fileBlobs}
                watermark={entitlements.watermark}
                notice={freeNotice}
                onBlockedExport={overLimits ? () => setDialog('upgrade') : undefined}
                fileName={slug(project.project_name ?? '')}
              />
              {project.segments.length > 0 && (
                <>
                  <Divider />
                  <VStack gap={4}>
                    <VStack gap={1}>
                      <Heading level={3}>Segments</Heading>
                      <Text type="supporting">Previews play straight from the source. Nothing is uploaded.</Text>
                    </VStack>
                    <Grid columns={{ minWidth: 240, max: 4 }} gap={4}>
                      {project.segments.map((segment, i) => (
                        <SegmentPreview
                          key={`${segment.scene_id}-${i}`}
                          index={i}
                          segment={segment}
                          sourceUrl={sourceUrl(segment.source_id)}
                        />
                      ))}
                    </Grid>
                  </VStack>
                </>
              )}
            </VStack>
          </LayoutContent>
        }
      />
    </>
  );
}
