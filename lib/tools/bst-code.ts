import type { Implementations } from "./languages";
import type { BstOperation } from "./bst";

/**
 * The recursive forms, which are the ones worth memorising. Search is shown
 * iteratively because that is how it is normally written — the recursion adds
 * a stack frame per level for no benefit.
 */
export const BST_CODE: Record<BstOperation, Implementations> = {
  insert: {
    csharp: `public Node Insert(Node node, int value)
{
    if (node is null) return new Node(value);

    if (value == node.Value) return node;   // a set: no duplicates

    if (value < node.Value) node.Left  = Insert(node.Left, value);
    else                    node.Right = Insert(node.Right, value);

    return node;
}`,
    typescript: `function insert(node: Node | null, value: number): Node {
  if (node === null) return { value, left: null, right: null };

  if (value === node.value) return node;   // a set: no duplicates

  if (value < node.value) node.left = insert(node.left, value);
  else node.right = insert(node.right, value);

  return node;
}`,
    python: `def insert(node: Node | None, value: int) -> Node:
    if node is None:
        return Node(value)

    if value == node.value:      # a set: no duplicates
        return node

    if value < node.value:
        node.left = insert(node.left, value)
    else:
        node.right = insert(node.right, value)

    return node`,
    java: `Node insert(Node node, int value) {
    if (node == null) return new Node(value);

    if (value == node.value) return node;   // a set: no duplicates

    if (value < node.value) node.left  = insert(node.left, value);
    else                    node.right = insert(node.right, value);

    return node;
}`,
  },

  search: {
    csharp: `public bool Search(Node node, int value)
{
    while (node is not null)
    {
        if (value == node.Value) return true;
        node = value < node.Value ? node.Left : node.Right;
    }
    return false;   // one comparison per level, so O(height)
}`,
    typescript: `function search(node: Node | null, value: number): boolean {
  while (node !== null) {
    if (value === node.value) return true;
    node = value < node.value ? node.left : node.right;
  }
  return false;   // one comparison per level, so O(height)
}`,
    python: `def search(node: Node | None, value: int) -> bool:
    while node is not None:
        if value == node.value:
            return True
        node = node.left if value < node.value else node.right
    return False    # one comparison per level, so O(height)`,
    java: `boolean search(Node node, int value) {
    while (node != null) {
        if (value == node.value) return true;
        node = value < node.value ? node.left : node.right;
    }
    return false;   // one comparison per level, so O(height)
}`,
  },

  remove: {
    csharp: `public Node Remove(Node node, int value)
{
    if (node is null) return null;

    if (value < node.Value) { node.Left  = Remove(node.Left, value);  return node; }
    if (value > node.Value) { node.Right = Remove(node.Right, value); return node; }

    // Found it. No child or one child is a straight promotion.
    if (node.Left is null)  return node.Right;
    if (node.Right is null) return node.Left;

    // Two children: the in-order successor is the only value that keeps
    // every ordering invariant intact.
    var successor = node.Right;
    while (successor.Left is not null) successor = successor.Left;

    node.Value = successor.Value;
    node.Right = Remove(node.Right, successor.Value);
    return node;
}`,
    typescript: `function remove(node: Node | null, value: number): Node | null {
  if (node === null) return null;

  if (value < node.value) { node.left = remove(node.left, value); return node; }
  if (value > node.value) { node.right = remove(node.right, value); return node; }

  // Found it. No child or one child is a straight promotion.
  if (node.left === null) return node.right;
  if (node.right === null) return node.left;

  // Two children: the in-order successor is the only value that keeps
  // every ordering invariant intact.
  let successor = node.right;
  while (successor.left !== null) successor = successor.left;

  node.value = successor.value;
  node.right = remove(node.right, successor.value);
  return node;
}`,
    python: `def remove(node: Node | None, value: int) -> Node | None:
    if node is None:
        return None

    if value < node.value:
        node.left = remove(node.left, value)
        return node
    if value > node.value:
        node.right = remove(node.right, value)
        return node

    # Found it. No child or one child is a straight promotion.
    if node.left is None:
        return node.right
    if node.right is None:
        return node.left

    # Two children: the in-order successor is the only value that keeps
    # every ordering invariant intact.
    successor = node.right
    while successor.left is not None:
        successor = successor.left

    node.value = successor.value
    node.right = remove(node.right, successor.value)
    return node`,
    java: `Node remove(Node node, int value) {
    if (node == null) return null;

    if (value < node.value) { node.left  = remove(node.left, value);  return node; }
    if (value > node.value) { node.right = remove(node.right, value); return node; }

    // Found it. No child or one child is a straight promotion.
    if (node.left == null)  return node.right;
    if (node.right == null) return node.left;

    // Two children: the in-order successor is the only value that keeps
    // every ordering invariant intact.
    Node successor = node.right;
    while (successor.left != null) successor = successor.left;

    node.value = successor.value;
    node.right = remove(node.right, successor.value);
    return node;
}`,
  },
};
