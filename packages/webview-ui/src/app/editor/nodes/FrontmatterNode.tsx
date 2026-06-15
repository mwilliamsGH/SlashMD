import {
  $getNodeByKey,
  DecoratorNode,
  DOMExportOutput,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from 'lexical';
import { createElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import Prism from 'prismjs';

export type SerializedFrontmatterNode = Spread<
  {
    yaml: string;
  },
  SerializedLexicalNode
>;

/**
 * A single block, pinned at the top of the document, holding the raw YAML
 * frontmatter as plain text. The text is round-tripped verbatim through the
 * `yaml` mdast node, so nested maps, comments and key ordering are preserved.
 */
export class FrontmatterNode extends DecoratorNode<JSX.Element> {
  __yaml: string;

  static getType(): string {
    return 'frontmatter';
  }

  static clone(node: FrontmatterNode): FrontmatterNode {
    return new FrontmatterNode(node.__yaml, node.__key);
  }

  constructor(yaml: string, key?: NodeKey) {
    super(key);
    this.__yaml = yaml;
  }

  getYaml(): string {
    return this.__yaml;
  }

  setYaml(yaml: string): void {
    const writable = this.getWritable();
    writable.__yaml = yaml;
  }

  createDOM(): HTMLElement {
    const element = document.createElement('div');
    element.className = 'frontmatter-block';
    return element;
  }

  updateDOM(): boolean {
    return false;
  }

  exportDOM(): DOMExportOutput {
    const pre = document.createElement('pre');
    pre.className = 'frontmatter-block';
    pre.textContent = this.__yaml;
    return { element: pre };
  }

  static importJSON(serializedNode: SerializedFrontmatterNode): FrontmatterNode {
    return new FrontmatterNode(serializedNode.yaml);
  }

  exportJSON(): SerializedFrontmatterNode {
    return {
      type: 'frontmatter',
      yaml: this.__yaml,
      version: 1,
    };
  }

  getTextContent(): string {
    return this.__yaml;
  }

  decorate(): JSX.Element {
    return createElement(FrontmatterComponent, {
      yaml: this.__yaml,
      nodeKey: this.__key,
    });
  }

  isInline(): boolean {
    return false;
  }
}

interface FrontmatterComponentProps {
  yaml: string;
  nodeKey: NodeKey;
}

function FrontmatterComponent({ yaml, nodeKey }: FrontmatterComponentProps): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [value, setValue] = useState(yaml);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  // Keep local state in sync when the document is re-loaded externally.
  useEffect(() => {
    setValue(yaml);
  }, [yaml]);

  const highlighted = useMemo(() => {
    try {
      return Prism.highlight(value, Prism.languages.yaml, 'yaml');
    } catch {
      return value.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));
    }
  }, [value]);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const next = event.target.value;
      setValue(next);
      editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        if ($isFrontmatterNode(node)) {
          node.setYaml(next);
        }
      });
    },
    [editor, nodeKey]
  );

  // Keep the highlight underlay scroll-aligned with the textarea.
  const handleScroll = useCallback(() => {
    if (preRef.current && textareaRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  const rows = Math.max(2, value.split('\n').length);

  return (
    <div className="frontmatter-editor" contentEditable={false}>
      <div className="frontmatter-label">Frontmatter</div>
      <div className="frontmatter-code">
        <pre ref={preRef} className="frontmatter-highlight" aria-hidden="true">
          <code
            className="language-yaml"
            dangerouslySetInnerHTML={{ __html: highlighted + '\n' }}
          />
        </pre>
        <textarea
          ref={textareaRef}
          className="frontmatter-input"
          value={value}
          onChange={handleChange}
          onScroll={handleScroll}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          rows={rows}
          aria-label="YAML frontmatter"
        />
      </div>
    </div>
  );
}

export function $createFrontmatterNode(yaml: string): FrontmatterNode {
  return new FrontmatterNode(yaml);
}

export function $isFrontmatterNode(
  node: LexicalNode | null | undefined
): node is FrontmatterNode {
  return node instanceof FrontmatterNode;
}
