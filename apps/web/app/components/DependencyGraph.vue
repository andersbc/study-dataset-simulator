<template>
  <AppCard title="Dependency Graph">
    <div class="d-flex justify-center rounded border"
      style="overflow: auto; min-height: 200px; background: rgba(var(--v-theme-surface-variant), 0.05);">
      <svg :width="width" :height="height" ref="svgRef" v-if="nodes.length > 0" class="graph-svg">
        <!-- Definitions for markers (arrowheads) -->
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" class="edge-marker" />
          </marker>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="1" dy="1" stdDeviation="2" flood-opacity="0.2" />
          </filter>
        </defs>

        <!-- 1. Edge Paths (Bottom) -->
        <g v-for="edge in edges" :key="`path-${edge.id}`" class="edge-group">
          <path :d="getEdgePath(edge)" class="edge-path" marker-end="url(#arrowhead)" fill="none" />
          <!-- Invisible wide path for easier hovering -->
          <path :d="getEdgePath(edge)" stroke="transparent" stroke-width="15" fill="none" />
        </g>

        <!-- 2. Nodes (Middle) -->
        <g v-for="node in layoutNodes" :key="node.id" :transform="`translate(${node.x}, ${node.y})`">
          <rect x="-40" y="-20" width="80" height="40" rx="8" class="node-rect" filter="url(#shadow)" />
          <text x="0" y="5" text-anchor="middle" font-size="12" font-weight="600" class="node-text">
            {{ formatName(node.name) }}
          </text>
        </g>

        <!-- 3. Edge Labels (Top) -->
        <g v-for="edge in edges" :key="`label-${edge.id}`" class="edge-group" style="pointer-events: none;">
          <rect :x="getEdgeLabelPos(edge).x - 12" :y="getEdgeLabelPos(edge).y - 12" width="24" height="16" rx="4"
            fill="rgba(var(--v-theme-surface), 0.9)" stroke="rgba(var(--v-theme-on-surface-variant), 0.2)"
            stroke-width="1" />

          <text :x="getEdgeLabelPos(edge).x" :y="getEdgeLabelPos(edge).y" text-anchor="middle" font-size="10"
            class="edge-label" dy="-2">
            {{ edge.coefficient }}
          </text>
        </g>
      </svg>
      <div v-else class="pa-8 text-medium-emphasis d-flex align-center justify-center" style="height: 200px">
        Add variables and relationships to visualize the graph.
      </div>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const design = useStudyDesign()
const width = 800
const height = 400

// Types for internal layout
interface LayoutNode {
  id: string
  name: string
  level: number
  x: number
  y: number
}

const formatName = (name: string) => {
  return name.length > 10 ? name.substring(0, 9) + '…' : name
}

// 1. Compute Nodes and Levels
const layoutNodes = computed((): LayoutNode[] => {
  if (!design.value.variables) return []

  const nodes = design.value.variables.map(v => ({
    id: v.name,
    name: v.name,
    level: 0,
    x: 0,
    y: 0
  }))

  const nodeMap = new Map(nodes.map(n => [n.id, n]))
  const effects = design.value.effects || []

  // Reset levels
  nodes.forEach(n => n.level = 0)

  // Propagate levels: Target Level = max(Target Level, Source Level + 1)
  let changed = true
  let iterations = 0
  const maxIterations = nodes.length + 1

  while (changed && iterations < maxIterations) {
    changed = false
    iterations++

    for (const eff of effects) {
      const source = nodeMap.get(eff.source)
      const target = nodeMap.get(eff.target)

      if (source && target) {
        if (target.level < source.level + 1) {
          target.level = source.level + 1
          changed = true
        }
      }
    }
  }

  // 2. Assign Coordinates
  const levels = new Map<number, LayoutNode[]>()
  nodes.forEach(n => {
    if (!levels.has(n.level)) levels.set(n.level, [])
    levels.get(n.level)?.push(n)
  })

  // Determine grid dimensions
  const maxLevel = Math.max(...Array.from(levels.keys()), 0)
  const numColumns = maxLevel + 1
  const columnWidth = width / (numColumns + 0.5) // Add padding
  const paddingX = 60

  levels.forEach((levelNodes, levelIndex) => {
    const rowHeight = height / (levelNodes.length + 1)
    levelNodes.forEach((node, index) => {
      // Center the graph horizontally
      const startX = (width - ((numColumns - 1) * columnWidth)) / 2
      node.x = paddingX + (levelIndex * columnWidth)
      node.y = (index + 1) * rowHeight
    })
  })

  return nodes
})

const edges = computed(() => {
  if (!design.value.effects) return []
  return design.value.effects.filter(e =>
    layoutNodes.value.find(n => n.id === e.source) &&
    layoutNodes.value.find(n => n.id === e.target)
  )
})

const nodes = computed(() => design.value.variables || [])

// Helper for paths
const getLayoutNode = (name: string) => layoutNodes.value.find(n => n.id === name)

const getEdgePath = (edge: any) => {
  const s = getLayoutNode(edge.source)
  const t = getLayoutNode(edge.target)
  if (!s || !t) return ''

  // Horizontal Cubic Bezier
  // Control Points: Halfway between X, but maintaining Y
  const midX = (s.x + t.x) / 2

  return `M ${s.x} ${s.y} 
          C ${midX} ${s.y}, 
            ${midX} ${t.y}, 
            ${t.x} ${t.y}`
}

const getEdgeLabelPos = (edge: any) => {
  const s = getLayoutNode(edge.source)
  const t = getLayoutNode(edge.target)
  if (!s || !t) return { x: 0, y: 0 }

  // Midpoint of the Bezier Curve (approximate)
  return {
    x: (s.x + t.x) / 2,
    y: (s.y + t.y) / 2
  }
}

</script>

<style scoped>
.graph-svg {
  font-family: 'Inter', sans-serif;
}

.node-rect {
  fill: rgb(var(--v-theme-surface));
  stroke: rgb(var(--v-theme-primary));
  stroke-width: 2px;
  transition: all 0.3s ease;
}

.node-text {
  fill: rgb(var(--v-theme-on-surface));
}

.edge-path {
  stroke: rgb(var(--v-theme-on-surface));
  stroke-width: 2px;
  opacity: 0.3;
  transition: all 0.3s ease;
}

.edge-marker {
  fill: rgb(var(--v-theme-on-surface));
  opacity: 0.6;
}

.edge-label {
  fill: rgb(var(--v-theme-on-surface));
  font-weight: bold;
}

/* Hover effects */
.edge-group:hover .edge-path {
  stroke: rgb(var(--v-theme-primary));
  stroke-width: 3px;
  opacity: 1;
}

.edge-group:hover .edge-marker {
  fill: rgb(var(--v-theme-primary));
}
</style>
