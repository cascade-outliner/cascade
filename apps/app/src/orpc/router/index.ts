import {
	createNode,
	deleteNode,
	getNode,
	getNodeAncestors,
	listNodes,
	moveNode,
	setNodeType,
	toggleNodeExpanded,
	updateNodeContent,
	visibleTree,
} from "@/core/nodes/node.procedures";
import { searchNodes } from "@/core/nodes/node.search";

export default {
	nodes: {
		list: listNodes,
		get: getNode,
		ancestors: getNodeAncestors,
		visibleTree,
		create: createNode,
		move: moveNode,
		toggleExpanded: toggleNodeExpanded,
		delete: deleteNode,
		updateContent: updateNodeContent,
		setType: setNodeType,
		search: searchNodes,
	},
};
