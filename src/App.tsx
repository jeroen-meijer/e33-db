import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import {
  databaseSchema,
  type Database,
  type Item,
  type Picto,
  type StatusEffect,
  type Weapon,
} from './db-types'

type Entry = Weapon | Picto | StatusEffect | Item
type CategoryFilter = 'all' | Entry['category']

function normalizeSearch(value: string): string {
  return value.toLowerCase().trim()
}

function subsequenceScore(haystack: string, needle: string): number {
  if (!needle) return 0
  let hi = 0
  let streak = 0
  let score = 0
  for (let ni = 0; ni < needle.length; ni += 1) {
    const char = needle[ni]
    const found = haystack.indexOf(char, hi)
    if (found === -1) return 0
    const gap = found - hi
    streak = gap === 0 ? streak + 1 : 1
    score += 1 + streak * 0.6 - Math.min(gap, 6) * 0.15
    hi = found + 1
  }
  return Math.max(0, score)
}

function textMatchScore(text: string, query: string): number {
  const t = normalizeSearch(text)
  const q = normalizeSearch(query)
  if (!q) return 0
  if (!t) return 0
  if (t === q) return 120
  if (t.startsWith(q)) return 95
  const includesAt = t.indexOf(q)
  if (includesAt >= 0) return 75 - includesAt * 0.1
  return subsequenceScore(t, q)
}

function tokenFuzzyScore(text: string, query: string): number {
  const textTokens = normalizeSearch(text).split(/[^a-z0-9]+/).filter(Boolean)
  const queryTokens = normalizeSearch(query).split(/[^a-z0-9]+/).filter(Boolean)
  if (queryTokens.length === 0) return 0
  let sum = 0
  for (const token of queryTokens) {
    let best = 0
    for (const candidate of textTokens) {
      best = Math.max(best, textMatchScore(candidate, token))
    }
    sum += best
  }
  return sum / queryTokens.length
}

function entrySearchScore(entry: Entry, query: string): number {
  const normalizedQuery = normalizeSearch(query)
  if (!normalizedQuery) return 1
  const nameScore = Math.max(
    textMatchScore(entry.name, normalizedQuery),
    tokenFuzzyScore(entry.name, normalizedQuery),
  )
  const content = searchText(entry)
  const contentScore = Math.max(
    textMatchScore(content, normalizedQuery),
    tokenFuzzyScore(content, normalizedQuery),
  )
  const total = nameScore * 4 + contentScore
  return total > 0 ? total : 0
}

function searchText(entry: Entry): string {
  const common = [entry.name, entry.description ?? '', entry.tags.join(' ')].join(' ')
  if (entry.category === 'weapon') {
    return [
      common,
      entry.wielders.join(' '),
      entry.scaling_attributes.join(' '),
      entry.element ?? '',
      entry.obtain_locations.join(' '),
      entry.weapon_effects.map((effect) => effect.effect).join(' '),
      entry.upgrade_levels
        .map((level) => `${level.level} ${level.required_tint?.item_name ?? ''}`)
        .join(' '),
    ].join(' ')
  }
  if (entry.category === 'picto') {
    return [
      common,
      entry.lumina_effect ?? '',
      entry.passive_bonuses.map((bonus) => `${bonus.stat} ${bonus.value ?? ''}`).join(' '),
      entry.obtain_locations.join(' '),
    ].join(' ')
  }
  if (entry.category === 'status_effect') {
    return [
      common,
      entry.effect_kind ?? '',
      entry.effect_summary ?? '',
      entry.related_skills.join(' '),
      entry.related_pictos.join(' '),
    ].join(' ')
  }
  return [common, entry.subtype, entry.usage ?? '', entry.obtain_locations.join(' ')].join(' ')
}

async function fetchDatabase(): Promise<Database> {
  const response = await fetch('/data/database.json')
  if (!response.ok) {
    throw new Error(`Failed to fetch database.json (${response.status})`)
  }
  const json = await response.json()
  return databaseSchema.parse(json)
}

function categoryLabel(category: Entry['category']): string {
  if (category === 'status_effect') return 'Status Effect'
  return category.charAt(0).toUpperCase() + category.slice(1)
}

function imageSizeClassForEntry(entry: Entry): string {
  if (entry.category === 'weapon') return 'h-60 w-40'
  if (entry.category === 'item') return 'h-36 w-36'
  if (entry.category === 'picto') return 'h-32 w-32'
  return 'h-32 w-32'
}

function renderPrettyDetails(entry: Entry) {
  if (entry.category === 'weapon') {
    return (
      <div className="grid gap-4 text-xs">
        <section className="grid gap-2">
          <h3 className="text-sm font-medium">Weapon Information</h3>
          <div className="grid gap-1 text-muted-foreground">
            <p>
              <strong className="text-foreground">Can be equipped by:</strong>{' '}
              {entry.wielders.join(', ') || 'Unknown'}
            </p>
            <p>
              <strong className="text-foreground">Element:</strong> {entry.element ?? 'Unknown'}
            </p>
            <p>
              <strong className="text-foreground">Scaling attributes:</strong>{' '}
              {entry.scaling_attributes.join(', ') || 'Unknown'}
            </p>
          </div>
        </section>

        {entry.weapon_summary && (
          <section className="grid gap-2">
            <h3 className="text-sm font-medium">Level {entry.weapon_summary.level ?? '?'} Summary</h3>
            <div className="grid gap-1 text-muted-foreground">
              <p>
                <strong className="text-foreground">Power:</strong> {entry.weapon_summary.power ?? '?'}
              </p>
              <p>
                <strong className="text-foreground">Element:</strong>{' '}
                {entry.weapon_summary.element ?? 'Unknown'}
              </p>
              <p>
                <strong className="text-foreground">Scaling:</strong>{' '}
                {entry.weapon_summary.scaling.map((scale) => `${scale.stat} ${scale.grade}`).join(', ')}
              </p>
            </div>
          </section>
        )}

        {entry.weapon_effects.length > 0 && (
          <section className="grid gap-2">
            <h3 className="text-sm font-medium">Milestone Effects</h3>
            <div className="overflow-hidden rounded-md border">
              <table className="w-full border-collapse text-left">
                <thead className="bg-muted/60">
                  <tr>
                    <th className="border-b px-2 py-1.5 text-[11px]">Level</th>
                    <th className="border-b px-2 py-1.5 text-[11px]">Effect</th>
                  </tr>
                </thead>
                <tbody>
                  {entry.weapon_effects.map((effect) => (
                    <tr key={effect.level}>
                      <td className="border-b px-2 py-1.5 align-top">LEVEL {effect.level}</td>
                      <td className="border-b px-2 py-1.5 text-muted-foreground">{effect.effect}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {entry.upgrade_levels.length > 0 && (
          <section className="grid gap-2">
            <h3 className="text-sm font-medium">Upgrade Guide</h3>
            <div className="rounded-md border">
              <table className="w-full border-collapse text-left">
                <thead className="bg-muted/60">
                  <tr>
                    <th className="border-b px-2 py-1.5 text-[11px]">LVL</th>
                    <th className="border-b px-2 py-1.5 text-[11px]">PWR</th>
                    <th className="border-b px-2 py-1.5 text-[11px]">Scaling</th>
                    <th className="border-b px-2 py-1.5 text-[11px]">Req. Tint</th>
                  </tr>
                </thead>
                <tbody>
                  {entry.upgrade_levels.map((level) => (
                    <tr key={level.level}>
                      <td className="border-b px-2 py-1.5">{level.level}</td>
                      <td className="border-b px-2 py-1.5">{level.power ?? '?'}</td>
                      <td className="border-b px-2 py-1.5 text-muted-foreground">
                        {level.scaling.map((scale) => `${scale.stat} ${scale.grade}`).join(', ')}
                      </td>
                      <td className="border-b px-2 py-1.5">
                        {level.required_tint ? (
                          <a
                            href={level.required_tint.wiki_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-primary underline-offset-2 hover:underline"
                          >
                            {level.required_tint.image_url ? (
                              <img
                                src={level.required_tint.image_url}
                                alt={level.required_tint.item_name}
                                className="size-6 rounded-sm border object-contain"
                                loading="lazy"
                              />
                            ) : null}
                            <span>
                              {level.required_tint.quantity}x {level.required_tint.item_name}
                            </span>
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="grid gap-2">
          <h3 className="text-sm font-medium">Where to Find</h3>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            {entry.obtain_locations.map((location) => (
              <li key={location}>{location}</li>
            ))}
          </ul>
        </section>
      </div>
    )
  }

  if (entry.category === 'picto') {
    return (
      <div className="grid gap-3 text-xs">
        <p>
          <strong>Lumina Cost:</strong> {entry.lumina_cost ?? 'Unknown'}
        </p>
        <p>
          <strong>Lumina Effect:</strong> {entry.lumina_effect ?? 'Unknown'}
        </p>
        <div className="grid gap-1">
          <strong>Passive Bonuses</strong>
          <ul className="list-disc pl-5 text-muted-foreground">
            {entry.passive_bonuses.map((bonus) => (
              <li key={`${bonus.stat}-${bonus.value}`}>{bonus.stat}: {bonus.value ?? '?'}</li>
            ))}
          </ul>
        </div>
      </div>
    )
  }

  if (entry.category === 'status_effect') {
    return (
      <div className="grid gap-2 text-xs">
        <p>
          <strong>Kind:</strong> {entry.effect_kind ?? 'Unknown'}
        </p>
        <p>
          <strong>Can stack:</strong> {String(entry.can_stack)}
        </p>
        <p className="text-muted-foreground">{entry.effect_summary ?? 'No summary available.'}</p>
      </div>
    )
  }

  return (
    <div className="grid gap-2 text-xs">
      <p>
        <strong>Subtype:</strong> {entry.subtype}
      </p>
      <p>
        <strong>Usage:</strong> {entry.usage ?? 'Unknown'}
      </p>
      <ul className="list-disc pl-5 text-muted-foreground">
        {entry.obtain_locations.map((location) => (
          <li key={location}>{location}</li>
        ))}
      </ul>
    </div>
  )
}

function App() {
  const { resolvedTheme, setTheme } = useTheme()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detailMode, setDetailMode] = useState<'pretty' | 'raw'>('pretty')
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false)

  const databaseQuery = useQuery({
    queryKey: ['database'],
    queryFn: fetchDatabase,
  })

  const allEntries = useMemo<Entry[]>(() => {
    const data = databaseQuery.data
    if (!data) return []
    return [...data.weapons, ...data.pictos, ...data.status_effects, ...data.items]
  }, [databaseQuery.data])

  const filteredEntries = useMemo(() => {
    const normalizedQuery = normalizeSearch(query)
    const ranked = allEntries
      .filter((entry) => (category === 'all' ? true : entry.category === category))
      .map((entry) => ({ entry, score: entrySearchScore(entry, normalizedQuery) }))
      .filter(({ score }) => normalizedQuery.length === 0 || score > 0)
      .sort((a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name))
    return ranked.map(({ entry }) => entry)
  }, [allEntries, category, query])

  const selectedEntry = useMemo(() => {
    if (!filteredEntries.length) return null
    if (!selectedId) return filteredEntries[0]
    return filteredEntries.find((entry) => entry.id === selectedId) ?? filteredEntries[0]
  }, [filteredEntries, selectedId])

  const searchSuggestions = useMemo(() => {
    const q = normalizeSearch(query)
    if (!q || !showSearchSuggestions) return []
    return filteredEntries.slice(0, 8)
  }, [filteredEntries, query, showSearchSuggestions])

  function selectEntryFromSearch(entry: Entry): void {
    setSelectedId(entry.id)
    setQuery(entry.name)
    setShowSearchSuggestions(false)
  }

  if (databaseQuery.isLoading) {
    return <div className="center-state">Loading database...</div>
  }

  if (databaseQuery.isError) {
    return (
      <div className="center-state">
        Failed to load database: {(databaseQuery.error as Error).message}
      </div>
    )
  }

  const metadata = databaseQuery.data!.metadata

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-3 p-3">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl">e33-db</CardTitle>
              <CardDescription>
                Fast debug browser for the generated CE33 JSON database. Functionality first; theme polish
                later.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              type="button"
            >
              {resolvedTheme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
              Theme: {resolvedTheme ?? 'dark'}
            </Button>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Filters</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="relative">
              <Input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setShowSearchSuggestions(true)
                }}
                onFocus={() => {
                  if (normalizeSearch(query)) setShowSearchSuggestions(true)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    const top = filteredEntries[0]
                    if (!top) return
                    event.preventDefault()
                    selectEntryFromSearch(top)
                  }
                  if (event.key === 'Escape') {
                    setShowSearchSuggestions(false)
                  }
                }}
                placeholder="Search by name, description, tags, effects, stats..."
              />
              {searchSuggestions.length > 0 ? (
                <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border bg-card shadow-lg">
                  <div className="max-h-64 overflow-y-auto">
                    {searchSuggestions.map((entry) => (
                      <button
                        key={`search-suggestion-${entry.category}-${entry.id}`}
                        type="button"
                        className="flex w-full flex-col border-b px-3 py-2 text-left text-xs last:border-b-0 hover:bg-muted"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selectEntryFromSearch(entry)}
                      >
                        <span className="font-medium">{entry.name}</span>
                        <span className="text-muted-foreground">
                          {categoryLabel(entry.category)} • {entry.id}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {(['all', 'weapon', 'picto', 'status_effect', 'item'] as const).map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant={value === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCategory(value)}
                >
                  {value === 'all' ? 'All' : categoryLabel(value)}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">Results: {filteredEntries.length}</Badge>
              <Badge variant="outline">
                DB totals W:{metadata.totals.weapons} P:{metadata.totals.pictos} S:{metadata.totals.status_effects}{' '}
                I:{metadata.totals.items}
              </Badge>
              <Badge variant="outline">Warnings: {metadata.warnings.length}</Badge>
            </div>
          </CardContent>
        </Card>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[340px_1fr]">
          <Card className="hidden min-h-0 lg:flex">
            <CardHeader>
              <CardTitle className="text-sm">Entries</CardTitle>
              <CardDescription>{filteredEntries.length} records</CardDescription>
            </CardHeader>
            <CardContent className="min-h-0">
              <ScrollArea className="h-[55vh] lg:h-[calc(100vh-270px)]">
                <div className="space-y-2 pr-2">
                  {filteredEntries.map((entry) => (
                    <button
                      className={cn(
                        'w-full rounded-md border p-2 text-left transition-colors',
                        selectedEntry?.id === entry.id
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:bg-muted',
                      )}
                      key={`${entry.category}:${entry.id}`}
                      onClick={() => setSelectedId(entry.id)}
                      type="button"
                    >
                      <div className="font-medium">{entry.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {categoryLabel(entry.category)} • {entry.id}
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="min-h-0">
            <CardHeader>
              <CardTitle className="text-sm">Detail</CardTitle>
              <CardDescription>Inspect parsed fields and raw JSON.</CardDescription>
            </CardHeader>
            <CardContent className="min-h-0 space-y-3">
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={detailMode === 'pretty' ? 'default' : 'outline'}
                  onClick={() => setDetailMode('pretty')}
                >
                  Pretty
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={detailMode === 'raw' ? 'default' : 'outline'}
                  onClick={() => setDetailMode('raw')}
                >
                  Raw JSON
                </Button>
              </div>
              <Separator />
              {selectedEntry ? (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold">
                        {selectedEntry.name}{' '}
                        <span className="text-sm font-normal text-muted-foreground">
                          ({categoryLabel(selectedEntry.category)})
                        </span>
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {selectedEntry.description ?? 'No description available.'}
                      </p>
                    </div>
                    {detailMode === 'pretty' && selectedEntry.image_url ? (
                      <a
                        href={selectedEntry.image_url}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 rounded-md border bg-muted/20 p-1"
                      >
                        <img
                          src={selectedEntry.image_url}
                          alt={selectedEntry.name}
                          className={cn('object-contain', imageSizeClassForEntry(selectedEntry))}
                          loading="lazy"
                        />
                      </a>
                    ) : null}
                  </div>
                  <div className="text-xs">
                    <a href={selectedEntry.source.url} target="_blank" rel="noreferrer">
                      Source page
                    </a>{' '}
                    • scraped at {selectedEntry.source.scraped_at}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedEntry.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <Separator />
                  {detailMode === 'pretty' ? (
                    <div className="pr-3">{renderPrettyDetails(selectedEntry)}</div>
                  ) : (
                    <div className="rounded-md border bg-muted/40 p-3">
                      <pre className="text-xs">{JSON.stringify(selectedEntry, null, 2)}</pre>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No matching entries.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default App
