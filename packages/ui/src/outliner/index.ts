import { Bullet } from "./components/bullet";
import { Children } from "./components/children";
import { Content } from "./components/content";
import { Item } from "./components/item";
import { Root } from "./components/root";
import { Toggle } from "./components/toggle";

export const Outliner = {
	Root,
	Item,
	Bullet,
	Toggle,
	Content,
	Children,
};

export type { OutlinerRootProps } from "./components/root";
export type { OutlineNode } from "./types";
