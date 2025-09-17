export { Heap };

class Heap {
    heap = [];
    cmp;

    constructor(cmp) {
        this.cmp = cmp;
    }

    isempty() {
        return this.heap.length === 0;
    }

    swap(index1, index2) {
        [this.heap[index1], this.heap[index2]] = [this.heap[index2], this.heap[index1]];
    }

    push(value) {
        this.heap.push(value);
        this.heapify_up();
    }

    first() {
        return this.heap[0];
    }

    heapify_up() {
        let current_index = this.heap.length - 1;
        let parent_index = Math.floor((current_index - 1) / 2);
        while (parent_index >= 0 && this.cmp(this.heap[current_index], this.heap[parent_index])) {
            this.swap(current_index, parent_index);
            current_index = parent_index;
            parent_index = Math.floor((current_index - 1) / 2);
        }
    }

    pop() {
        const minValue = this.heap[0];
        if (this.heap.length === 1) {
            this.heap.pop()
        } else {
            this.heap[0] = this.heap.pop();
            this.heapify_down();
        }
        return minValue;
    }

    heapify_down() {
        let current_index = 0;
        let smaller_child_index = 2 * current_index + 1;
        while (smaller_child_index < this.heap.length) {
            if (smaller_child_index + 1 < this.heap.length && this.cmp(this.heap[smaller_child_index + 1 ], this.heap[smaller_child_index])) {
                smaller_child_index += 1;
            }
            if (this.cmp(this.heap[current_index], this.heap[smaller_child_index])) {
                break;
            } else {
                this.swap(current_index, smaller_child_index);
            }
            current_index = smaller_child_index;
            smaller_child_index = 2 * current_index + 1;
        }
    }
}