#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
冒泡排序算法实现
Bubble Sort Algorithm Implementation
"""

def bubble_sort(arr):
    """
    冒泡排序函数
    
    Args:
        arr (list): 待排序的数组
        
    Returns:
        list: 排序后的数组
    """
    n = len(arr)
    
    # 外层循环控制排序轮数
    for i in range(n):
        # 标记本轮是否有交换，用于优化
        swapped = False
        
        # 内层循环进行相邻元素比较
        # 每轮结束后，最大元素会"冒泡"到末尾
        for j in range(0, n - i - 1):
            # 如果前一个元素大于后一个元素，则交换
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
                swapped = True
        
        # 如果本轮没有交换，说明数组已经有序，可以提前结束
        if not swapped:
            break
    
    return arr

def bubble_sort_demo():
    """演示冒泡排序的使用"""
    print("🫧 冒泡排序演示")
    print("=" * 50)
    
    # 测试数据
    test_arrays = [
        [64, 34, 25, 12, 22, 11, 90],
        [5, 1, 4, 2, 8],
        [1, 2, 3, 4, 5],  # 已排序数组
        [5, 4, 3, 2, 1],  # 逆序数组
        [42],             # 单个元素
        []                # 空数组
    ]
    
    for i, original in enumerate(test_arrays, 1):
        print(f"\n测试 {i}:")
        print(f"原数组: {original}")
        
        # 复制数组进行排序（避免修改原数组）
        arr_copy = original.copy()
        sorted_arr = bubble_sort(arr_copy)
        
        print(f"排序后: {sorted_arr}")

if __name__ == "__main__":
    bubble_sort_demo()
    
    print("\n" + "=" * 50)
    print("💡 使用方法:")
    print("1. 直接运行: python bubble_sort.py")
    print("2. 导入使用: from bubble_sort import bubble_sort")
    print("   示例: sorted_list = bubble_sort([3, 1, 4, 1, 5])")