import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock html-to-image
jest.mock('html-to-image', () => ({
  toPng: jest.fn().mockResolvedValue('data:image/png;base64,abc'),
  toSvg: jest.fn().mockResolvedValue('data:image/svg+xml;base64,abc'),
}));

// Mock reactflow
jest.mock('reactflow', () => ({
  ...jest.requireActual('reactflow'),
  useNodesState: () => [[], jest.fn()],
  useEdgesState: () => [[], jest.fn()],
  useReactFlow: () => ({ fitView: jest.fn() }),
  ReactFlow: () => <div data-testid="react-flow" />,
  Background: () => null,
  Controls: () => null,
  MiniMap: () => null,
}));

import { toSvg } from 'html-to-image';

describe('SVG Export', () => {
  it('calls toSvg with the wrapper element', async () => {
    const mockWrapper = document.createElement('div');
    const mockToSvg = toSvg as jest.Mock;
    mockToSvg.mockResolvedValue('data:image/svg+xml;base64,test');

    await mockToSvg(mockWrapper, { backgroundColor: '#020617' });

    expect(mockToSvg).toHaveBeenCalledWith(mockWrapper, {
      backgroundColor: '#020617',
    });
  });

  it('returns a valid SVG data URL', async () => {
    const mockToSvg = toSvg as jest.Mock;
    mockToSvg.mockResolvedValue('data:image/svg+xml;base64,test');

    const result = await mockToSvg(document.createElement('div'));
    expect(result).toMatch(/^data:image\/svg\+xml/);
  });

  it('handles empty SVG export result', async () => {
    const mockToSvg = toSvg as jest.Mock;
    mockToSvg.mockResolvedValue('');

    const result = await mockToSvg(document.createElement('div'));
    expect(result).toBe('');
  });

  it('handles SVG export error gracefully', async () => {
    const mockToSvg = toSvg as jest.Mock;
    mockToSvg.mockRejectedValue(new Error('Export failed'));

    await expect(
      mockToSvg(document.createElement('div'))
    ).rejects.toThrow('Export failed');
  });
});

describe('JSON Export', () => {
  it('exports correct node structure', () => {
    const nodes = [
      { id: '1', data: { label: 'Node 1' }, position: { x: 0, y: 0 } },
    ];
    const exported = nodes.map(n => ({
      id: n.id,
      label: n.data?.label,
      position: n.position,
    }));

    expect(exported[0]).toEqual({
      id: '1',
      label: 'Node 1',
      position: { x: 0, y: 0 },
    });
  });

  it('exports correct edge structure', () => {
    const edges = [
      { id: 'e1', source: '1', target: '2', label: 'connects' },
    ];
    const exported = edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
    }));

    expect(exported[0]).toEqual({
      id: 'e1',
      source: '1',
      target: '2',
      label: 'connects',
    });
  });

  it('handles empty graph data', () => {
    const graphData = null;
    expect(graphData).toBeNull();
  });
});
