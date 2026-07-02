import {
	deleteNode,
	getNode,
	listNodes,
	moveNode,
	toggleNodeExpanded,
	updateNodeContent,
	visibleTree,
} from "@/core/nodes/node.procedures";

export default {
	nodes: {
		list: listNodes,
		get: getNode,
		visibleTree,
		move: moveNode,
		toggleExpanded: toggleNodeExpanded,
		delete: deleteNode,
		updateContent: updateNodeContent,
	},
};
