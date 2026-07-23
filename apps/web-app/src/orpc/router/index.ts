import {
	createNode,
	deleteNode,
	getNode,
	restoreNode,
	setNodeType,
	updateNodeContent,
} from "@/core/nodes/node-crud.procedures";
import { setNodeDueDate } from "@/core/nodes/node-due-date.procedures";
import { resolveNodeSlug } from "@/core/nodes/node-slug.procedures";
import {
	duplicateNode,
	getNodeAncestors,
	moveNode,
	toggleNodeExpanded,
} from "@/core/nodes/node-structure.procedures";
import {
	deleteTag,
	listTags,
	setNodeTags,
} from "@/core/nodes/node-tags.procedures";
import { listNodes, visibleTree } from "@/core/nodes/node-tree-read.procedures";
import {
	getPremiumStatus,
	requestPremiumSeat,
	revokePremiumSeat,
} from "@/core/premium/premium.procedures";
import {
	getSettings,
	updateSettings,
} from "@/core/settings/settings.procedures";

export default {
	nodes: {
		list: listNodes,
		get: getNode,
		resolveSlug: resolveNodeSlug,
		ancestors: getNodeAncestors,
		visibleTree,
		create: createNode,
		move: moveNode,
		toggleExpanded: toggleNodeExpanded,
		delete: deleteNode,
		restore: restoreNode,
		duplicate: duplicateNode,
		updateContent: updateNodeContent,
		setType: setNodeType,
		setDueDate: setNodeDueDate,
		setTags: setNodeTags,
		listTags,
		deleteTag,
	},
	settings: {
		get: getSettings,
		update: updateSettings,
	},
	premium: {
		get: getPremiumStatus,
		requestSeat: requestPremiumSeat,
		revokeSeat: revokePremiumSeat,
	},
};
