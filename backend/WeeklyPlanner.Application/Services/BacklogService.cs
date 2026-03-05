using WeeklyPlanner.Application.DTOs;
using WeeklyPlanner.Application.Interfaces;
using WeeklyPlanner.Domain.Entities;
using WeeklyPlanner.Domain.Enums;
using WeeklyPlanner.Domain.Exceptions;

namespace WeeklyPlanner.Application.Services;

/// <summary>
/// Manages backlog items — CRUD operations, status transitions, and validation.
/// All backlog items start as Available. The lead can archive/unarchive them.
/// Status transitions to InProgress and Done are handled automatically by
/// WeeklyPlanService when plans are frozen or completed.
/// </summary>
public class BacklogService : IBacklogService
{
    private readonly IBacklogItemRepository _backlogRepository;
    public BacklogService(IBacklogItemRepository backlogRepository) => _backlogRepository = backlogRepository;

    /// <summary>Returns all non-archived backlog items, optionally filtered by category.</summary>
    public async Task<IEnumerable<BacklogItemDto>> GetAllBacklogItemsAsync(CategoryType? category = null)
    {
        var items = await _backlogRepository.GetAllAsync(category);
        return items.Select(MapToDto);
    }

    /// <summary>Returns all backlog items including archived ones, optionally filtered by category.</summary>
    public async Task<IEnumerable<BacklogItemDto>> GetAllBacklogItemsIncludingInactiveAsync(CategoryType? category = null)
    {
        var items = await _backlogRepository.GetAllIncludingInactiveAsync(category);
        return items.Select(MapToDto);
    }

    /// <summary>Creates a new backlog item with status Available.</summary>
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
            Status = BacklogItemStatus.Available
        };

        var created = await _backlogRepository.AddAsync(item);
        await _backlogRepository.SaveChangesAsync();
        return MapToDto(created);
    }

    /// <summary>
    /// Updates a backlog item's fields. Status can be changed via the Status field.
    /// Category cannot be changed if the item is currently InProgress.
    /// </summary>
    public async Task<BacklogItemDto> UpdateBacklogItemAsync(Guid id, UpdateBacklogItemRequest request)
    {
        var item = await _backlogRepository.GetByIdAsync(id)
            ?? throw new NotFoundException("BacklogItem", id);

        if (request.Title is not null)
        {
            if (string.IsNullOrWhiteSpace(request.Title))
                throw new BusinessRuleException("Backlog item title cannot be empty.");
            item.Title = request.Title.Trim();
        }
        if (request.Description is not null) item.Description = request.Description.Trim();
        if (request.Category is not null)
        {
            if (!Enum.IsDefined(typeof(CategoryType), request.Category.Value))
                throw new BusinessRuleException($"Invalid category: {request.Category}.");
            if (item.Status == BacklogItemStatus.InProgress)
                throw new BusinessRuleException("Cannot change category while the item is in an active plan.");
            item.Category = request.Category.Value;
        }
        // Only update EstimatedHours when explicitly provided in the request.
        // Archive/unarchive calls don't send this field, so we must not overwrite
        // the existing value with null.
        if (request.EstimatedHours.HasValue)
        {
            if (request.EstimatedHours.Value <= 0)
                throw new BusinessRuleException("Estimated hours must be greater than 0.");
            item.EstimatedHours = request.EstimatedHours.Value;
        }

        // Handle status transitions
        if (request.Status.HasValue)
        {
            ValidateStatusTransition(item.Status, request.Status.Value);
            item.Status = request.Status.Value;
        }

        await _backlogRepository.SaveChangesAsync();
        return MapToDto(item);
    }

    /// <summary>Archives a backlog item (sets status to Archived). Cannot archive items in active plans.</summary>
    public async Task DeleteBacklogItemAsync(Guid id)
    {
        var item = await _backlogRepository.GetByIdAsync(id)
            ?? throw new NotFoundException("BacklogItem", id);

        if (item.Status == BacklogItemStatus.InProgress)
            throw new BusinessRuleException("Cannot archive a backlog item that is currently in an active weekly plan.");

        if (await _backlogRepository.IsUsedInActivePlanAsync(id))
            throw new BusinessRuleException("Cannot archive a backlog item that is currently used in an active weekly plan.");

        item.Status = BacklogItemStatus.Archived;
        await _backlogRepository.SaveChangesAsync();
    }

    /// <summary>Permanently deletes a backlog item. Only allowed if never used in any plan.</summary>
    public async Task HardDeleteBacklogItemAsync(Guid id)
    {
        var item = await _backlogRepository.GetByIdAsync(id)
            ?? throw new NotFoundException("BacklogItem", id);

        if (await _backlogRepository.IsReferencedInAnyPlanAsync(id))
            throw new BusinessRuleException("Cannot permanently delete a backlog item that has been used in a plan. Archive it instead.");

        _backlogRepository.Remove(item);
        await _backlogRepository.SaveChangesAsync();
    }

    /// <summary>
    /// Validates that a status transition is allowed.
    /// Manual transitions: Available ↔ Archived, Done → Available.
    /// Auto transitions (InProgress/Done) are handled by WeeklyPlanService, not here.
    /// </summary>
    private static void ValidateStatusTransition(BacklogItemStatus current, BacklogItemStatus target)
    {
        if (current == target) return; // No-op is always valid

        var valid = (current, target) switch
        {
            (BacklogItemStatus.Available, BacklogItemStatus.Archived)  => true,  // Lead archives
            (BacklogItemStatus.Archived, BacklogItemStatus.Available)  => true,  // Lead unarchives
            (BacklogItemStatus.Done, BacklogItemStatus.Available)      => true,  // Lead moves back to backlog
            (BacklogItemStatus.Available, BacklogItemStatus.InProgress) => true,  // Auto: plan frozen
            (BacklogItemStatus.InProgress, BacklogItemStatus.Done)     => true,  // Auto: plan completed
            (BacklogItemStatus.InProgress, BacklogItemStatus.Available) => true,  // Auto: plan cancelled
            _ => false
        };

        if (!valid)
            throw new BusinessRuleException(
                $"Cannot transition backlog item from '{current}' to '{target}'.");
    }

    /// <summary>Maps a domain entity to the DTO returned by the API.</summary>
    private static BacklogItemDto MapToDto(BacklogItem item) =>
        new(item.Id, item.Title, item.Description, item.Category,
            item.Status.ToString(), item.IsActive, item.EstimatedHours);
}
