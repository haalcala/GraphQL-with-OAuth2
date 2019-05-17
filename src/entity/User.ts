import { Entity, ObjectIdColumn, ObjectID, Column, BaseEntity } from "typeorm";
import { ObjectType, Field, ID, Root } from "type-graphql";

@ObjectType()
@Entity("Users")
export class User extends BaseEntity {
	@Field(() => ID)
	@ObjectIdColumn()
	id: ObjectID;

	@Field({ nullable: true })
	@Column("text", { nullable: true })
	firstName: string;

	@Field({ nullable: true })
	@Column("text", { nullable: true })
	lastName: string;

	@Field()
	name(@Root() parent: User): string {
		return `${parent.firstName} ${parent.lastName}`;
	}

	@Field()
	@Column("text")
	createdAt: Date;

	@Field()
	@Column("text")
	updatedAt: Date;

	@Field()
	@Column("text", { unique: true })
	email: string;

	@Column("text", { nullable: true })
	password: string;

	@Column("text", { nullable: true })
	salt: string;
}
