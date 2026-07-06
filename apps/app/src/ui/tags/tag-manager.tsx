import { toast } from "@cascade/ui/toast";
import { PlusIcon, TrashIcon } from "@phosphor-icons/react/ssr";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { TagType } from "@/core/tags/tag.types";
import { defaultTagColor, tagPalette } from "@/core/tags/tag-palette";
import { orpc } from "@/orpc/client";

interface TagNode extends TagType {
	children: TagNode[];
}

function buildTree(tags: TagType[]): TagNode[] {
	const byId = new Map<string, TagNode>(
		tags.map((t) => [t.id, { ...t, children: [] }]),
	);
	const roots: TagNode[] = [];
	for (const tag of byId.values()) {
		if (tag.parentId && byId.has(tag.parentId)) {
			byId.get(tag.parentId)?.children.push(tag);
		} else {
			roots.push(tag);
		}
	}
	return roots;
}

function errorMessage(err: unknown): string {
	return err instanceof Error ? err.message : "Something went wrong";
}

function ColorSwatchPicker({
	value,
	onChange,
}: {
	value: string;
	onChange: (color: string) => void;
}) {
	return (
		<div className="flex flex-wrap gap-1">
			{tagPalette.map((swatch) => (
				<button
					key={swatch.value}
					type="button"
					aria-label={swatch.label}
					onClick={() => onChange(swatch.value)}
					className={`size-5 cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-redleather/50 ${
						value === swatch.value
							? "ring-2 ring-dark-grey dark:ring-ginger"
							: ""
					}`}
					style={{ backgroundColor: swatch.value }}
				/>
			))}
		</div>
	);
}

function TagRow({ tag, depth }: { tag: TagNode; depth: number }) {
	const queryClient = useQueryClient();
	const [name, setName] = useState(tag.name);
	const listKey = orpc.tags.list.key();

	const invalidate = () => queryClient.invalidateQueries({ queryKey: listKey });

	const rename = useMutation(
		orpc.tags.rename.mutationOptions({
			onSuccess: invalidate,
			onError: (err) => {
				setName(tag.name);
				toast.error(errorMessage(err));
			},
		}),
	);
	const setColor = useMutation(
		orpc.tags.setColor.mutationOptions({
			onSuccess: invalidate,
			onError: (err) => toast.error(errorMessage(err)),
		}),
	);
	const remove = useMutation(
		orpc.tags.delete.mutationOptions({
			onSuccess: invalidate,
			onError: (err) => toast.error(errorMessage(err)),
		}),
	);

	return (
		<>
			<div
				className="flex items-center gap-2 py-1.5 text-sm"
				style={{ paddingLeft: depth * 20 }}
			>
				<ColorSwatchPicker
					value={tag.color}
					onChange={(color) => setColor.mutate({ id: tag.id, color })}
				/>
				<input
					value={name}
					onChange={(e) => setName(e.target.value)}
					onBlur={() => {
						if (name.trim() && name !== tag.name) {
							rename.mutate({ id: tag.id, name: name.trim() });
						} else {
							setName(tag.name);
						}
					}}
					onKeyDown={(e) => {
						if (e.key === "Enter") e.currentTarget.blur();
						if (e.key === "Escape") {
							setName(tag.name);
							e.currentTarget.blur();
						}
					}}
					className="min-w-0 flex-1 rounded-md bg-dark-grey/5 px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-redleather/50 dark:bg-ginger/10"
				/>
				<button
					type="button"
					aria-label={`Delete tag ${tag.name}`}
					onClick={() => remove.mutate({ id: tag.id })}
					className="flex cursor-pointer items-center justify-center rounded-md p-1 text-dark-grey/60 outline-none hover:bg-ginger/70 hover:text-dark-grey focus-visible:ring-2 focus-visible:ring-redleather/50 dark:text-ginger/60 dark:hover:bg-ginger/20 dark:hover:text-ginger"
				>
					<TrashIcon size={14} weight="bold" />
				</button>
			</div>
			{tag.children.map((child) => (
				<TagRow key={child.id} tag={child} depth={depth + 1} />
			))}
		</>
	);
}

function NewTagForm({ tags }: { tags: TagType[] }) {
	const queryClient = useQueryClient();
	const [name, setName] = useState("");
	const [parentId, setParentId] = useState<string | "">("");
	const [color, setColor] = useState<string>(defaultTagColor);

	const create = useMutation(
		orpc.tags.create.mutationOptions({
			onSuccess: () => {
				setName("");
				queryClient.invalidateQueries({ queryKey: orpc.tags.list.key() });
			},
			onError: (err) => toast.error(errorMessage(err)),
		}),
	);

	return (
		<form
			className="mt-3 flex flex-col gap-2 border-t border-dark-grey/10 pt-3 dark:border-ginger/15"
			onSubmit={(e) => {
				e.preventDefault();
				if (!name.trim()) return;
				create.mutate({
					name: name.trim(),
					parentId: parentId || null,
					color,
				});
			}}
		>
			<div className="flex gap-2">
				<input
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="New tag name"
					className="min-w-0 flex-1 rounded-md bg-dark-grey/5 px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-redleather/50 dark:bg-ginger/10"
				/>
				<select
					value={parentId}
					onChange={(e) => setParentId(e.target.value)}
					className="rounded-md bg-dark-grey/5 px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-redleather/50 dark:bg-ginger/10"
				>
					<option value="">No parent</option>
					{tags.map((tag) => (
						<option key={tag.id} value={tag.id}>
							{tag.name}
						</option>
					))}
				</select>
				<button
					type="submit"
					aria-label="Create tag"
					className="flex cursor-pointer items-center justify-center rounded-md bg-redleather p-2 text-ginger outline-none focus-visible:ring-2 focus-visible:ring-redleather/50 disabled:cursor-default disabled:opacity-40"
					disabled={!name.trim()}
				>
					<PlusIcon size={14} weight="bold" />
				</button>
			</div>
			<ColorSwatchPicker value={color} onChange={setColor} />
		</form>
	);
}

export function TagManager() {
	const { data: tags } = useQuery(orpc.tags.list.queryOptions({ input: {} }));
	const tree = buildTree(tags ?? []);

	return (
		<div>
			{tree.length === 0 ? (
				<p className="text-sm text-dark-grey/60 dark:text-ginger/60">
					No tags yet. Create one below.
				</p>
			) : (
				<div className="max-h-64 overflow-y-auto">
					{tree.map((tag) => (
						<TagRow key={tag.id} tag={tag} depth={0} />
					))}
				</div>
			)}
			<NewTagForm tags={tags ?? []} />
		</div>
	);
}
