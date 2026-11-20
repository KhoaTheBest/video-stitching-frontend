import { lazy, Suspense, useMemo, useState } from 'react';
import { CodeBracketIcon, ListBulletIcon, SpeakerXMarkIcon } from '@heroicons/react/24/outline';
import { Banner } from '@astryxdesign/core/Banner';
import { Divider } from '@astryxdesign/core/Divider';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Grid } from '@astryxdesign/core/Grid';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { Icon } from '@astryxdesign/core/Icon';
import { Layout, LayoutContent, LayoutPanel, VStack } from '@astryxdesign/core/Layout';
import { List, ListItem } from '@astryxdesign/core/List';
import { Section } from '@astryxdesign/core/Section';
import { Selector } from '@astryxdesign/core/Selector';
import { Spinner } from '@astryxdesign/core/Spinner';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { Heading, Text } from '@astryxdesign/core/Text';
import samples from '../data/video_cutdown_results.json';
import { ExportPanel } from '../components/ExportPanel';
import { SegmentPreview } from '../components/SegmentPreview';
import { parseProject, planStitch, type ExportLimits, type StitchPlan } from '../engine/plan';
import { formatTime } from '../lib/format';
import { readStored, writeStored } from '../lib/storage';
import type { SampleData, VideoCutdownResult } from '../types';

const JsonEditor = lazy(() => import('../components/JsonEditor'));

const SAMPLES = (samples as unknown as SampleData[]).map((s) => s.video_cutdown_result);
const SAMPLE_KEY = 'selectedProjectIndex';

const DEFAULT_LIMITS: ExportLimits = { maxSegments: Infinity, maxOutputSeconds: Infinity, maxShortSide: 720 };

function initialSampleIndex(): number {
  const saved = Number.parseInt(readStored(SAMPLE_KEY) ?? '', 10);
  return saved >= 0 && saved < SAMPLES.length ? saved : 0;
}

const toJson = (project: VideoCutdownResult) => JSON.stringify({ video_cutdown_result: project }, null, 2);

function slug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'stitched';
}

type PanelTab = 'segments' | 'json';

export function WorkspacePage() {
  const [sampleIndex, setSampleIndex] = useState(initialSampleIndex);
  const [project, setProject] = useState<VideoCutdownResult>(() => SAMPLES[sampleIndex]);
  const [jsonText, setJsonText] = useState(() => toJson(project));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [tab, setTab] = useState<PanelTab>('segments');
  const isMobile = useMediaQuery('(max-width: 768px)');

  const { plan, planError } = useMemo((): { plan: StitchPlan | null; planError: string | null } => {
    try {
      return { plan: planStitch(project, DEFAULT_LIMITS), planError: null };
    } catch (e) {
      return { plan: null, planError: (e as Error).message };
    }
  }, [project]);

  const loadSample = (value: string) => {
    const index = Number(value);
    setSampleIndex(index);
    writeStored(SAMPLE_KEY, String(index));
    setProject(SAMPLES[index]);
    setJsonText(toJson(SAMPLES[index]));
    setJsonError(null);
  };

  const applyJson = () => {
    try {
      setProject(parseProject(jsonText));
      setJsonError(null);
    } catch (e) {
      setJsonError((e as Error).message);
    }
  };

  const sourceUrl = (sourceId: number) => project.source_files.find((s) => s.source_id === sourceId)?.url ?? null;

  const segmentList = (
    <List density="balanced" hasDividers={false}>
      {project.segments.map((segment, i) => (
        <ListItem
          key={`${segment.scene_id}-${i}`}
          label={`${i + 1}. ${segment.purpose || `Scene ${segment.scene_id}`}`}
          description={`${formatTime(segment.start_ms / 1000)} – ${formatTime(segment.end_ms / 1000)} · source ${segment.source_id}`}
          endContent={segment.muted ? <Icon icon={SpeakerXMarkIcon} color="secondary" size="sm" /> : undefined}
        />
      ))}
    </List>
  );

  const panel = (
    <LayoutPanel hasDivider={!isMobile} padding={0} width={isMobile ? '100%' : 360} label="Project">
      <VStack gap={0}>
        <Section variant="transparent" padding={4}>
          <VStack gap={3}>
            <Heading level={2}>{project.project_name || 'Untitled project'}</Heading>
            <Selector
              label="Sample project"
              options={SAMPLES.map((p, i) => ({ value: String(i), label: p.project_name || `Project ${i + 1}` }))}
              value={String(sampleIndex)}
              onChange={loadSample}
            />
          </VStack>
        </Section>
        <TabList value={tab} onChange={(v: string) => setTab(v as PanelTab)} layout="fill" hasDivider>
          <Tab value="segments" label="Segments" icon={<Icon icon={ListBulletIcon} size="sm" />} />
          <Tab value="json" label="JSON" icon={<Icon icon={CodeBracketIcon} size="sm" />} />
        </TabList>
        <Section variant="transparent" padding={tab === 'json' ? 2 : 4}>
          {tab === 'segments' ? (
            project.segments.length > 0 ? (
              segmentList
            ) : (
              <EmptyState title="No segments" description="Add segments in the JSON tab." isCompact />
            )
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
    <Layout
      height="auto"
      header={isMobile ? panel : undefined}
      start={isMobile ? undefined : panel}
      content={
        <LayoutContent padding={isMobile ? 4 : 8}>
          <VStack gap={8} maxWidth={1100}>
            <ExportPanel plan={plan} planError={planError} fileName={slug(project.project_name ?? '')} />
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
          </VStack>
        </LayoutContent>
      }
    />
  );
}
