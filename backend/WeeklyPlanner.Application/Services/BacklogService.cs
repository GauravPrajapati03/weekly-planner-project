using WeeklyPlanner.Application.DTOs;
using WeeklyPlanner.Application.Interfaces;
using WeeklyPlanner.Domain.Entities;
using WeeklyPlanner.Domain.Enums;
using WeeklyPlanner.Domain.Exceptions;

namespace WeeklyPlanner.Application.Services;

/// <summary>
/// Handles all backlog item CRUD operations.
/// Enforces constraints such as: title is required, cannot delete an item used in an active plan.
/// </summary>
public class BacklogService : IBacklogService
{
    private readonly IBacklogItemRepository _backlogRepository;

    public BacklogService(IBacklogItemRepository backlogRepository)
    {
        _backlogRepository = backlogRepository;
    }

    /// <inheritdoc />
    public async Task<IEnumerable<BacklogItemDto>> GetAllBacklogItemsAsync(CategoryType? category = null)
    {
        var items = await _backlogRepository.GetAllAsync(category);
        return items.Select(MapToDto);
    }

    /// <inheritdoc />
    public async Task<IEnumerable<BacklogItemDto>> GetAllBacklogItemsIncludingInactiveAsync(CategoryType? category = null)
    {
        var items = await _backlogRepository.GetAllIncludingInactiveAsync(category);
        return items.Select(MapToDto);
    }

    /// <inheritdoc />
    public async Task<BacklogItemDto> CreateBacklogItemAsync(CreateBacklogItemRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            throw new BusinessRuleException("Backlog item title is required.");

        if (!Enum.IsDefined(typeof(CategoryType), request.Category))
            throw new BusinessRuleException($"Invalid category value: {request.Category}.");

        if (request.EstimatedHours.HasValue && request.EstimatedHours.Value <= 0)
            throw new BusinessRuleException("Estimated hours must be greater than 0.");

        var item = new BacklogItem
        {
            Title = request.Title.Trim(),
            Description = request.Description?.Trim() ?? string.Empty,
            Category = request.Category,
            EstimatedHours = request.EstimatedHours,
            IsActive = true
        };

        var created = await _backlogRepository.AddAsync(item);
        await _backlogRepository.SaveChangesAsync();

        return MapToDto(created);
    }

    /// <inheritdoc />
    public async Task<BacklogItemDto> UpdateBacklogItemAsync(int id, UpdateBacklogItemRequest request)
    {
        var item = await _backlogRepository.GetByIdAsync(id)
            ?? throw new NotFoundException("BacklogItem", id);

        if (request.Title is not null)
        {
            if (string.IsNullOrWhiteSpace(request.Title))
                throw new BusinessRuleException("Backlog item title cannot be empty.");
            item.Title = request.Title.Trim();
        }

        if (request.Description is not null)
            item.Description = request.Description.Trim();

        if (request.Category is not null)
        {
            if (!Enum.IsDefined(typeof(CategoryType), request.Category.Value))
                throw new BusinessRuleException($"Invalid category: {request.Category}.");
            item.Category = request.Category.Value;
        }

        // Allow clearing EstimatedHours by passing null explicitly
        if (request.EstimatedHours.HasValue && request.EstimatedHours.Value <= 0)
            throw new BusinessRuleException("Estimated hours must be greater than 0.");

        item.EstimatedHours = request.EstimatedHours; // null clears it

        // Unarchive (restore) support
        if (request.IsActive.HasValue)
            item.IsActive = request.IsActive.Value;

        await _backlogRepository.SaveChangesAsync();
        return MapToDto(item);
    }

    /// <inheritdoc />
    public async Task DeleteBacklogItemAsync(int id)
    {
        var item = await _backlogRepository.GetByIdAsync(id)
            ?? throw new NotFoundException("BacklogItem", id);

        if (await _backlogRepository.IsUsedInActivePlanAsync(id))
            throw new BusinessRuleException(
                "Cannot archive a backlog item that is currently used in an active weekly plan.");

        // Soft delete — preserve historical data in completed plans
        item.IsActive = false;
        await _backlogRepository.SaveChangesAsync();
    }

    /// <inheritdoc />
    public async Task HardDeleteBacklogItemAsync(int id)
    {
        var item = await _backlogRepository.GetByIdAsync(id)
            ?? throw new NotFoundException("BacklogItem", id);

        // Hard delete is only allowed if the item has NEVER been referenced in any plan
        if (await _backlogRepository.IsReferencedInAnyPlanAsync(id))
            throw new BusinessRuleException(
                "Cannot permanently delete a backlog item that has been used in a plan. Archive it instead.");

        _backlogRepository.Remove(item);
        await _backlogRepository.SaveChangesAsync();
    }

    // ── Private Helpers ────────────────────────────────────────────────────

    private static BacklogItemDto MapToDto(BacklogItem item) =>
        new(item.Id, item.Title, item.Description, item.Category, item.IsActive, item.EstimatedHours);
}

